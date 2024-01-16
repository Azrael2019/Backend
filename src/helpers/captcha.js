import fetch from "node-fetch";
import config from "../configs/config";

const checkCaptcha = async token => {
    try {
        if (token) {
            const url = `https://www.google.com/recaptcha/api/siteverify?secret=${config.captcha.secretKey}&response=${token}`
            const res = await fetch(url).then(res => res.json())
            return !!res.success;
        }
    } catch (e) {
    }
    return false;
}
export default checkCaptcha;
