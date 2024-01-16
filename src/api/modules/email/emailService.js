import path from "path";
import utilsLog from "../../../helpers/logger";
import sesService from "../../../helpers/sesService";
import Mustache from "mustache";
import fs from "fs";
import config from "../../../configs/config";

const logger = utilsLog(__filename);

const generateEmails = (template, content, lang, isManager = false) => {
    logger.debug(`generateEmails - args: template(${template}) content(${JSON.stringify(content)})`);

    //Read templates
    let generalLayout = fs.readFileSync(path.resolve(__dirname, './templates/general-layout.html'), 'utf8');
    let templateHtml, templateText;
    try {
        templateHtml = fs.readFileSync(path.resolve(__dirname, './templates/' + template + '/body' + (lang ? '-' + lang : '') + '.html'), 'utf8');
    } catch (e) {
        templateHtml = fs.readFileSync(path.resolve(__dirname, './templates/' + template + '/body.html'), 'utf8');
    }
    try {
        templateText = fs.readFileSync(path.resolve(__dirname, './templates/' + template + '/body' + (lang ? '-' + lang : '') + '.txt'), 'utf8');
    } catch (e) {
        templateText = fs.readFileSync(path.resolve(__dirname, './templates/' + template + '/body.txt'), 'utf8');
    }

    //Render templateHtml to string
    let templateHtmlString = Mustache.render(templateHtml, content);

    //Render general layout for templateHtmlString
    const logo = `https://cdn.smart-commerce.es/email/${isManager ? 'logo_manager_min' : 'logo_min'}.png`;
    const webURL = isManager ? config.webURL : config.managerURL;
    let bodyHtml = Mustache.render(generalLayout, {templateHtmlString, webURL, year: new Date().getFullYear(), logo});

    //Render text for non html mail services
    let bodyText = Mustache.render(templateText, content);
    return {bodyHtml, bodyText};
};

const userSignUp = (name, link, email, lang) => {
    logger.debug(`userSignUp - args: name(${name}), link(${link}), email(${email})`);
    let emails = generateEmails('userSignUp', {name, link}, lang);
    let subject = '¡Bienvenido a Smart COMMERCE!'; // TODO: internationalization
    return sesService.sendEmail(email, subject, emails.bodyHtml, emails.bodyText);
};

const managerSignUp = (name, link, email, lang) => {
    logger.debug(`managerSignUp - args: name(${name}), link(${link}), email(${email})`);
    let emails = generateEmails('managerSignUp', {name, link}, lang, true);
    let subject = '¡Bienvenido manager a Smart COMMERCE!'; // TODO: internationalization
    return sesService.sendEmail(email, subject, emails.bodyHtml, emails.bodyText);
};

const passwordChanged = (email, lang, isManager) => {
    logger.debug(`passwordChanged - args: email(${email})`);
    let emails = generateEmails('passwordChanged', {}, lang, isManager);
    let subject = '¡Tu contraseña ha sido cambiada correctamente!'; // TODO: internationalization
    return sesService.sendEmail(email, subject, emails.bodyHtml, emails.bodyText);
};

const activateAccount = (name, email, lang, isManager) => {
    logger.debug(`activateAccount - args: email(${email})`);
    const link = isManager ? config.webURL : config.managerURL;
    let emails = generateEmails('activateAccount', {name, link}, lang, isManager);
    let subject = '¡Cuenta activada!'; // TODO: internationalization
    return sesService.sendEmail(email, subject, emails.bodyHtml, emails.bodyText);
};

const recoveryPassword = (name, link, email, lang, isManager) => {
    logger.debug(`recoveryPassword - args: link(${link}), email(${email}), name(${name})`);
    let emails = generateEmails('recoveryPassword', {link, name}, lang, isManager);
    let subject = 'Restablecer contraseña'; // TODO: internationalization
    return sesService.sendEmail(email, subject, emails.bodyHtml, emails.bodyText);
};

const sponsorBooking = (email, promotion, sponsor, sponsorLogo, lang, isManager) => {
    logger.debug(`sponsorBooking - args: email(${email}), promotion(${promotion}), sponsor(${sponsor}), sponsorLogo(${sponsorLogo})`);
    let emails = generateEmails('sponsorBooking', {promotion, sponsor, sponsorLogo}, lang, isManager);
    let subject = 'Activación promo patrocinada'; // TODO: internationalization
    return sesService.sendEmail(email, subject, emails.bodyHtml, emails.bodyText);
};

export default {
    userSignUp,
    managerSignUp,
    passwordChanged,
    activateAccount,
    recoveryPassword,
    sponsorBooking,
};
