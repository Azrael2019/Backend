import CategoryModel from "../../models/categoryModel";
import ServiceCache from "../_serviceCache";

class CategoryService extends ServiceCache {

    constructor() {
        super('Category', CategoryModel);
    }
}

export default new CategoryService()
