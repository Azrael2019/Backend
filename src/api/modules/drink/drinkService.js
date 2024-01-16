import DrinkModel from "../../models/drinkModel";
import ServiceCache from "../_serviceCache";

class DrinkService extends ServiceCache {

    constructor() {
        super('Drink', DrinkModel);
    }
}

export default new DrinkService()
