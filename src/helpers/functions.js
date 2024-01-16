import config from "../configs/config";
import moment from "moment-timezone";

export const shortHash = () => {
    // I generate the UID from two parts here
    // to ensure the random number provide enough bits.
    let firstPart = (Math.random() * 46656) | 0;
    let secondPart = (Math.random() * 46656) | 0;
    firstPart = ("000" + firstPart.toString(36)).slice(-3);
    secondPart = ("000" + secondPart.toString(36)).slice(-3);
    return firstPart + secondPart;
};

export const minutesOfDay = (m) => {
    return m.getMinutes() + m.getHours() * 60;
};

export const dateAdd = (days = 0, timeZone = config.timeZone) => {
    const now = new Date(new Date().toLocaleString("UTC", {timeZone}));
    const dateStr = `${now.getFullYear()}-${now.getMonth() + 1}-${now.getDate()} 00:00:00`;
    const date = moment.tz(dateStr, 'YYYY-MM-DD HH:mm:ss', timeZone)
    return date.add(days, "days").toDate();
};

export const notEmpty = arr => {
    return arr.length > 0;
};

export const checkUniqueLanguage = (arr) => checkUniqueValue('language', arr);

export const checkUniqueValue = (field, arr) => {
    if (arr.length > 0) {
        const obj = {};
        const isArray = Array.isArray(field);
        for (let i = 0; i < arr.length; i++) {
            const value = isArray ? field.map(item => arr[i][item]).join('-') : arr[i][field];
            if (value && obj[value]) return false;
            obj[value] = true;
        }
    }
    return true;
};

export const slugify = text => {
    let str = (text || '').toString().toLowerCase()
        .replace(/^\s+|\s+$/g, ''); // trim

    // remove accents, swap ñ for n, etc
    const from = "àáäâèéëêìíïîòóöôùúüûñç·/_,:;";
    const to = "aaaaeeeeiiiioooouuuunc------";
    for (let i = 0, l = from.length; i < l; i++) {
        str = str.replace(new RegExp(from.charAt(i), 'g'), to.charAt(i));
    }

    return str.replace(/[^a-z0-9 -]/g, '') // remove invalid chars
        .replace(/\s+/g, '-') // collapse whitespace and replace by -
        .replace(/-+/g, '-'); // collapse dashes
};

export const uuidv4 = () => {
    return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, function (c) {
        let r = Math.random() * 16 | 0, v = c === 'x' ? r : (r & 0x3 | 0x8);
        return v.toString(16);
    });
};

export const isInt = value => {
    if (isNaN(value)) {
        return false;
    }
    const x = parseFloat(value);
    return (x | 0) === x;
};

export const isDecimal = value => {
    return !isNaN(value) && !/^\s*$/.test(value);
};

export const isDate = value => {
    return !isNaN(Date.parse(value))
};

export const diacriticRegex = text => {
    const mappings = {
        a: String.fromCharCode(65, 97, 192, 224, 193, 225, 194, 226, 195, 227, 196, 228, 229, 258, 259),
        e: String.fromCharCode(69, 101, 200, 232, 201, 233, 202, 234, 203, 235),
        i: String.fromCharCode(73, 105, 204, 236, 205, 237, 206, 238, 207, 239),
        o: String.fromCharCode(79, 111, 210, 242, 211, 243, 212, 244, 213, 245, 214, 246),
        n: String.fromCharCode(78, 110, 209, 241),
        u: String.fromCharCode(85, 117, 217, 249, 218, 250, 219, 251, 220, 252),
        c: String.fromCharCode(67, 99, 199, 231),
        y: String.fromCharCode(89, 121, 221, 253, 159, 255),
    };
    return text.split('').map((letter) => {
        const lower = letter.toLowerCase();
        return mappings[lower] ? `[${mappings[lower]}]` : letter;
    }).join('');
}

export const diffObjects = (o1, o2) => {
    // choose a map() impl.
    // you may use $.map from jQuery if you wish
    const map = Array.prototype.map ?
        function (a) {
            return Array.prototype.map.apply(a, Array.prototype.slice.call(arguments, 1));
        } :
        function (a, f) {
            let ret = new Array(a.length);
            for (let i = 0, length = a.length; i < length; i++)
                ret[i] = f(a[i], i);
            return ret.concat();
        };

    // shorthand for push impl.
    const push = Array.prototype.push;

    // check for null/undefined values
    if ((o1 == null) || (o2 == null)) {
        if (o1 != o2)
            return [["", "null", o1 != null, o2 != null]];

        return undefined; // both null
    }
    // compare types
    if ((o1.constructor != o2.constructor) ||
        (typeof o1 != typeof o2)) {
        return [["", "type", Object.prototype.toString.call(o1), Object.prototype.toString.call(o2)]]; // different type

    }

    // compare arrays
    if (Object.prototype.toString.call(o1) == "[object Array]") {
        if (o1.length != o2.length) {
            return [["", "length", o1.length, o2.length]]; // different length
        }
        let diff = [];
        for (let i = 0; i < o1.length; i++) {
            // per element nested diff
            const innerDiff = diffObjects(o1[i], o2[i]);
            if (innerDiff) { // o1[i] != o2[i]
                // merge diff array into parent's while including parent object name ([i])
                push.apply(diff, map(innerDiff, function (o, j) {
                    o[0] = "[" + i + "]" + o[0];
                    return o;
                }));
            }
        }
        // if any differences were found, return them
        if (diff.length)
            return diff;
        // return nothing if arrays equal
        return undefined;
    }

    // compare object trees
    if (Object.prototype.toString.call(o1) == "[object Object]") {
        let diff = [];
        // check all props in o1
        for (let prop in o1) {
            // the double check in o1 is because in V8 objects remember keys set to undefined
            if ((typeof o2[prop] == "undefined") && (typeof o1[prop] != "undefined")) {
                // prop exists in o1 but not in o2
                diff.push(["[" + prop + "]", "undefined", o1[prop], undefined]); // prop exists in o1 but not in o2

            } else {
                // per element nested diff
                const innerDiff = diffObjects(o1[prop], o2[prop]);
                if (innerDiff) { // o1[prop] != o2[prop]
                    // merge diff array into parent's while including parent object name ([prop])
                    push.apply(diff, map(innerDiff, function (o, j) {
                        o[0] = "[" + prop + "]" + o[0];
                        return o;
                    }));
                }

            }
        }
        for (let prop in o2) {
            // the double check in o2 is because in V8 objects remember keys set to undefined
            if ((typeof o1[prop] == "undefined") && (typeof o2[prop] != "undefined")) {
                // prop exists in o2 but not in o1
                diff.push(["[" + prop + "]", "undefined", undefined, o2[prop]]); // prop exists in o2 but not in o1

            }
        }
        // if any differences were found, return them
        if (diff.length)
            return diff;
        // return nothing if objects equal
        return undefined;
    }
    // if same type and not null or objects or arrays
    // perform primitive value comparison
    if (o1 != o2)
        return [["", "value", o1, o2]];

    // return nothing if values are equal
    return undefined;
};
