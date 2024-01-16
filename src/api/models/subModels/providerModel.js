import SubModel from "../_subModel";

const ProviderSchema = new SubModel({
    id: {type: String, required: true},
    name: {type: String, required: true},
});

ProviderSchema.index({id: 1, name: 1}, {name: 'idAndNameProviderIdx'});

export default ProviderSchema;
