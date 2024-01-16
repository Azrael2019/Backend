import utilsLog from "../../helpers/logger";
import {rejectPromise} from "../../helpers/response";
import constants from "../../helpers/constants";
import s3Service from "../../helpers/s3Service";
import _ from "lodash";

const logger = utilsLog(__filename);

const normalizeQuery = (query, user) => {

    // TODO: check t=<type>  ==> find|findOne|count|aggregate|distinct|aggregate|mapReduce
    query.q = query.q ? query.q : '{}';
    const q = JSON.parse(query.q);
    if (!user || user.role !== constants.users.type.ADMIN) {
        q.deleted = false;
    }
    delete q.t;
    query.q = JSON.stringify(q);
    if (!query.sk) query.sk = 0;
    if (!query.l) query.l = 100;
    if (query.f) {
        try {
            query.f = JSON.parse(query.f);
        } catch (ignore) {
        }
    }
    return query;
};

class Service {

    constructor(modelName, model, {attachments} = {}) {
        this.modelName = modelName;
        this.model = model;
        this.attachments = attachments;
    }

    getList(query, user) {
        logger.debug(`${this.modelName}.getList - args: query(${JSON.stringify(query)})`);
        if (query.t === 'aggregate') {
            return this.model.query(query);
        } else {
            query = normalizeQuery(query, user);
            const queryCount = (!user || user.role === constants.users.type.USER) && this.modelName === 'Catalog'
                ? this.model.count(JSON.parse(query.q))
                : this.model.query(Object.assign({}, query, {t: 'count'}));
            return Promise.all([this.model.query(query), queryCount, this.model.countDocuments({deleted: false})])
                .then(values => {
                    const totalFiltered = values[1] && values[1].hasOwnProperty('count') ? values[1].count : (values[1] || 0) === 0 && values[0].length > 0 ? values[2] : values[1] || 0,
                        total = values[2],
                        skip = parseInt(query.sk),
                        limit = parseInt(query.l),
                        page = totalFiltered === 0 ? 0 : parseInt(`${skip / limit}`) + 1,
                        pages = totalFiltered === 0 ? 0 : parseInt(`${totalFiltered / limit}`) + 1;
                    return {
                        items: values[0],
                        count: values[0].length,
                        skip,
                        limit,
                        totalFiltered,
                        total,
                        page,
                        pages,
                    }
                });
        }
    }

    getById(id, query = {}, user) {
        logger.debug(`${this.modelName}.getById - args: id(${id})`);
        let functionQuery = this.model.findById(id, query.f);
        if (query.p) {
            try {
                query.p = JSON.parse(query.p);
            } catch (e) {
                query.p = query.p.split(',');
            }
            query.p.forEach(item => functionQuery.populate(item));
        }
        return functionQuery;
    }

    async create(itemSaveOri, user) {
        logger.debug(`${this.modelName}.create - args: itemSave(${JSON.stringify(itemSaveOri)})`);

        // Create new item
        delete itemSaveOri.createdAt;
        delete itemSaveOri.deleted;
        let itemSave = new this.model(itemSaveOri);

        // Check required fields
        const error = itemSave.validateSync();
        if (error) {
            return rejectPromise.validationMongoose(this.modelName, error)
        }

        // Check attachments
        itemSave = await this._checkAttachmentFields(itemSave, this.attachments);

        // Save item
        return itemSave.save({new: true})
            .catch(error => {
                if (11000 === error.code || 11001 === error.code) {
                    return rejectPromise.validation(this.modelName, null, constants.errors.kind.exist);
                }
                if (error.name === 'ValidationError') {
                    return rejectPromise.validationMongoose(this.modelName, error)
                }
                throw error;
            });
    }

    async updateById(id, itemSaveOri, user) {
        logger.debug(`${this.modelName}.updateById - args: id(${id}), itemSave(${JSON.stringify(itemSaveOri)})`);
        delete itemSaveOri.createdAt;
        delete itemSaveOri.deleted;
        const query = {_id: id};

        // Check attachments
        let itemSave = await this._checkAttachmentFields(itemSaveOri, this.attachments);

        // Update
        return this.model.findOneAndUpdate(query, itemSave, {new: true, runValidators: true})
            .then(item => {
                if (!item) return rejectPromise.validation(this.modelName, null, constants.errors.kind.notFound);
                return item;
            })
            .catch(error => {
                if (11000 === error.code || 11001 === error.code) {
                    return rejectPromise.validation(this.modelName, null, constants.errors.kind.exist);
                }
                if (error.name === 'ValidationError') {
                    return rejectPromise.validationMongoose(this.modelName, error)
                }
                throw error;
            });
    }

    deleteById(id, user) {
        logger.debug(`${this.modelName}.deleteById - args: id(${id})`);
        const query = {_id: id};
        return this.model.findOneAndUpdate(query, {deleted: true}, {new: true})
            .then(item => {
                if (!item) return rejectPromise.validation(this.modelName, null, constants.errors.kind.notFound);
                return item;
            });
    }

    deleteByQuery(query, user) {
        logger.debug(`${this.modelName}.deleteByQuery - args: query(${JSON.stringify(query)})`);
        return this.model.updateMany(query, {$set: {deleted: true}});
    }

    getOneByQuery(query, populate = [], fields) {
        logger.debug(`${this.modelName}.getOneByQuery - args: query(${JSON.stringify(query)})`);
        let functionQuery = this.model.findOne(query, fields, {strictQuery: false});
        populate.forEach(item => functionQuery.populate(item));
        return functionQuery;
    }

    updateOneByQuery(query, itemSave, user, params) {
        logger.debug(`${this.modelName}.updateOneByQuery - args: query(${JSON.stringify(query)}), itemSave(${JSON.stringify(itemSave)})`);
        return this.model.findOne(query)
            .then(item => {
                if (!item) return rejectPromise.validation(this.modelName, null, constants.errors.kind.notFound);
                return this.updateById(item.id, itemSave, user, params)
            });
    }

    updateByQuery(query, itemSave) {
        logger.debug(`${this.modelName}.updateByQuery - args: query(${JSON.stringify(query)}), itemSave(${JSON.stringify(itemSave)})`);
        delete itemSave.createdAt;
        return this.model.updateMany(query, itemSave);
    }

    _checkAttachmentFile(file, attachment, fileName) {
        if (file && file.url && !file.url.startsWith('http')) {

            // Upload to S3
            return s3Service.uploadFileBase64(file.url, attachment, fileName);
        } else {
            return Promise.resolve(file);
        }
    }

    async _checkAttachmentFields(item, attachments) {
        if (attachments && attachments.length) {

            // Normalize attachment
            attachments = attachments.map(attachment => Object.assign({}, attachment, {field: attachment.field !== undefined ? attachment.field : 'picture'}));

            // Check file uploaded
            const values = await Promise.all(attachments.map(async attachment => {

                // Check files
                let files;
                attachment.isObjArray = attachment.field.indexOf('[0]') !== -1;
                if (attachment.isObjArray) {
                    const fields = attachment.field.split('[0]');
                    const tmpFiles = _.get(item, fields[0]);
                    if (!tmpFiles || tmpFiles.length === 0 || fields.length > 2) return Promise.resolve(tmpFiles);
                    files = tmpFiles.map(file => fields[1] ? _.get(file, fields[1].replace('.', '')) : file)
                } else {
                    files = attachment.field === '' ? item : _.get(item, attachment.field);
                }
                if (!files) return Promise.resolve(files);
                if (Array.isArray(files)) {
                    return await Promise.all(files.map(file => this._checkAttachmentFile(file, attachment, file.name)))
                } else {
                    return this._checkAttachmentFile(files, attachment, files.name);
                }
            }));
            const setData = (item, field, data) => {
                const xField = field === '' ? field : `${field}.`;
                ['url', 'type', 'thumb'].map(key => _.set(item, data[key] && `${xField}${key}`, data[key]));
            };
            values.forEach((files, index) => {
                if ((files && Object.keys(files).length !== 0) || (Array.isArray(files) && files.length !== 0)) {
                    if (attachments[index].isObjArray) {
                        files.forEach((file, i) => setData(item, `${attachments[index].field.replace('[0]', `[${i}]`)}`, file));
                    } else {
                        setData(item, attachments[index].field, files);
                    }
                }
            });
        }
        return item;
    }

    _findOneAndUpdate(query, doc, options) {
        return this.model.findOneAndUpdate(query, doc, options);
    }

    _findByIdAndUpdate(id, doc, options) {
        return this.model.findByIdAndUpdate(id, doc, options);
    }

    _findAll(query) {
        return this.model.query(query);
    }

    _parseQuery(query = {}, user) {
        let q = JSON.parse(query.q ? query.q : '{}');
        if (!user || user.role !== constants.users.type.ADMIN) {
            q = {$and: Object.keys(q).length === 0 && q.constructor === Object ? [] : [q]};
        }
        return q;
    }
}

export default Service
