import mongoose from "mongoose";

class SubModel extends mongoose.Schema {

    constructor(schema) {
        super(Object.assign({_id: false}, schema));
        this.options.toJSON = {
            transform: function (doc, ret) {
                delete ret._id;
                return ret;
            }
        };
    }
}

export default SubModel