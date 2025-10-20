/******/ (() => { // webpackBootstrap
/******/ 	"use strict";
/******/ 	var __webpack_modules__ = ({

/***/ 8:
/***/ ((__unused_webpack_module, exports, __webpack_require__) => {


/*
 * Copyright 2018 Amazon.com, Inc. or its affiliates. All Rights Reserved.
 * Licensed under the Apache License, Version 2.0 (the 'License').
 * You may not use this file except in compliance with the License.
 * A copy of the License is located at
 *      http://www.apache.org/licenses/LICENSE-2.0
 *
 * or in the 'license' file accompanying this file. This file is distributed
 * on an 'AS IS' BASIS, WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either
 * express or implied. See the License for the specific language governing
 * permissions and limitations under the License.
 */
Object.defineProperty(exports, "__esModule", ({ value: true }));
exports.getViewportProfile = exports.getViewportDpiGroup = exports.getViewportSizeGroup = exports.getViewportOrientation = exports.ViewportDpiGroupOrder = exports.ViewportSizeGroupOrder = void 0;
const ask_sdk_runtime_1 = __webpack_require__(995);
exports.ViewportSizeGroupOrder = ['XSMALL', 'SMALL', 'MEDIUM', 'LARGE', 'XLARGE'];
exports.ViewportDpiGroupOrder = ['XLOW', 'LOW', 'MEDIUM', 'HIGH', 'XHIGH', 'XXHIGH'];
/**
 * return the {@link ViewportOrientation} of given width and height value
 * @param {number} width
 * @param {number} height
 * @return {ViewportOrientation}
 */
function getViewportOrientation(width, height) {
    return width > height
        ? 'LANDSCAPE'
        : width < height
            ? 'PORTRAIT'
            : 'EQUAL';
}
exports.getViewportOrientation = getViewportOrientation;
/**
 * return the {@link ViewportSizeGroup} of given size value
 * @param {number} size
 * @return {ViewportSizeGroup}
 */
function getViewportSizeGroup(size) {
    if (isBetween(size, 0, 600)) {
        return 'XSMALL';
    }
    else if (isBetween(size, 600, 960)) {
        return 'SMALL';
    }
    else if (isBetween(size, 960, 1280)) {
        return 'MEDIUM';
    }
    else if (isBetween(size, 1280, 1920)) {
        return 'LARGE';
    }
    else if (isBetween(size, 1920, Number.MAX_VALUE)) {
        return 'XLARGE';
    }
    throw (0, ask_sdk_runtime_1.createAskSdkError)('ViewportUtils', `unknown size group value ${size}`);
}
exports.getViewportSizeGroup = getViewportSizeGroup;
/**
 * return the {@link ViewportDpiGroup} of given dpi value
 * @param {number} dpi
 * @return {ViewportDpiGroup}
 */
function getViewportDpiGroup(dpi) {
    if (isBetween(dpi, 0, 121)) {
        return 'XLOW';
    }
    else if (isBetween(dpi, 121, 161)) {
        return 'LOW';
    }
    else if (isBetween(dpi, 161, 241)) {
        return 'MEDIUM';
    }
    else if (isBetween(dpi, 241, 321)) {
        return 'HIGH';
    }
    else if (isBetween(dpi, 321, 481)) {
        return 'XHIGH';
    }
    else if (isBetween(dpi, 481, Number.MAX_VALUE)) {
        return 'XXHIGH';
    }
    throw (0, ask_sdk_runtime_1.createAskSdkError)('ViewportUtils', `unknown dpi group value ${dpi}`);
}
exports.getViewportDpiGroup = getViewportDpiGroup;
/**
 * check if target number is within the range of [min, max);
 * @param {number} target
 * @param {number} min
 * @param {number} max
 * @return {boolean}
 */
function isBetween(target, min, max) {
    return target >= min && target < max;
}
/**
 * return the {@link ViewportProfile} of given request envelope
 * @param {RequestEnvelope} requestEnvelope
 * @return {ViewportProfile}
 */
function getViewportProfile(requestEnvelope) {
    const viewportState = requestEnvelope.context.Viewport;
    if (viewportState) {
        const currentPixelWidth = viewportState.currentPixelWidth;
        const currentPixelHeight = viewportState.currentPixelHeight;
        const dpi = viewportState.dpi;
        const shape = viewportState.shape;
        const viewportOrientation = getViewportOrientation(currentPixelWidth, currentPixelHeight);
        const viewportDpiGroup = getViewportDpiGroup(dpi);
        const pixelWidthSizeGroup = getViewportSizeGroup(currentPixelWidth);
        const pixelHeightSizeGroup = getViewportSizeGroup(currentPixelHeight);
        if (shape === 'ROUND'
            && viewportOrientation === 'EQUAL'
            && viewportDpiGroup === 'LOW'
            && pixelWidthSizeGroup === 'XSMALL'
            && pixelHeightSizeGroup === 'XSMALL') {
            return 'HUB-ROUND-SMALL';
        }
        if (shape === 'RECTANGLE'
            && viewportOrientation === 'LANDSCAPE'
            && viewportDpiGroup === 'LOW'
            && exports.ViewportSizeGroupOrder.indexOf(pixelWidthSizeGroup) <= exports.ViewportSizeGroupOrder.indexOf('MEDIUM')
            && exports.ViewportSizeGroupOrder.indexOf(pixelHeightSizeGroup) <= exports.ViewportSizeGroupOrder.indexOf('XSMALL')) {
            return 'HUB-LANDSCAPE-SMALL';
        }
        if (shape === 'RECTANGLE'
            && viewportOrientation === 'LANDSCAPE'
            && viewportDpiGroup === 'LOW'
            && exports.ViewportSizeGroupOrder.indexOf(pixelWidthSizeGroup) <= exports.ViewportSizeGroupOrder.indexOf('MEDIUM')
            && exports.ViewportSizeGroupOrder.indexOf(pixelHeightSizeGroup) <= exports.ViewportSizeGroupOrder.indexOf('SMALL')) {
            return 'HUB-LANDSCAPE-MEDIUM';
        }
        if (shape === 'RECTANGLE'
            && viewportOrientation === 'LANDSCAPE'
            && viewportDpiGroup === 'LOW'
            && exports.ViewportSizeGroupOrder.indexOf(pixelWidthSizeGroup) >= exports.ViewportSizeGroupOrder.indexOf('LARGE')
            && exports.ViewportSizeGroupOrder.indexOf(pixelHeightSizeGroup) >= exports.ViewportSizeGroupOrder.indexOf('SMALL')) {
            return 'HUB-LANDSCAPE-LARGE';
        }
        if (shape === 'RECTANGLE'
            && viewportOrientation === 'LANDSCAPE'
            && viewportDpiGroup === 'MEDIUM'
            && exports.ViewportSizeGroupOrder.indexOf(pixelWidthSizeGroup) >= exports.ViewportSizeGroupOrder.indexOf('MEDIUM')
            && exports.ViewportSizeGroupOrder.indexOf(pixelHeightSizeGroup) >= exports.ViewportSizeGroupOrder.indexOf('SMALL')) {
            return 'MOBILE-LANDSCAPE-MEDIUM';
        }
        if (shape === 'RECTANGLE'
            && viewportOrientation === 'PORTRAIT'
            && viewportDpiGroup === 'MEDIUM'
            && exports.ViewportSizeGroupOrder.indexOf(pixelWidthSizeGroup) >= exports.ViewportSizeGroupOrder.indexOf('SMALL')
            && exports.ViewportSizeGroupOrder.indexOf(pixelHeightSizeGroup) >= exports.ViewportSizeGroupOrder.indexOf('MEDIUM')) {
            return 'MOBILE-PORTRAIT-MEDIUM';
        }
        if (shape === 'RECTANGLE'
            && viewportOrientation === 'LANDSCAPE'
            && viewportDpiGroup === 'MEDIUM'
            && exports.ViewportSizeGroupOrder.indexOf(pixelWidthSizeGroup) >= exports.ViewportSizeGroupOrder.indexOf('SMALL')
            && exports.ViewportSizeGroupOrder.indexOf(pixelHeightSizeGroup) >= exports.ViewportSizeGroupOrder.indexOf('XSMALL')) {
            return 'MOBILE-LANDSCAPE-SMALL';
        }
        if (shape === 'RECTANGLE'
            && viewportOrientation === 'PORTRAIT'
            && viewportDpiGroup === 'MEDIUM'
            && exports.ViewportSizeGroupOrder.indexOf(pixelWidthSizeGroup) >= exports.ViewportSizeGroupOrder.indexOf('XSMALL')
            && exports.ViewportSizeGroupOrder.indexOf(pixelHeightSizeGroup) >= exports.ViewportSizeGroupOrder.indexOf('SMALL')) {
            return 'MOBILE-PORTRAIT-SMALL';
        }
        if (shape === 'RECTANGLE'
            && viewportOrientation === 'LANDSCAPE'
            && exports.ViewportDpiGroupOrder.indexOf(viewportDpiGroup) >= exports.ViewportDpiGroupOrder.indexOf('HIGH')
            && exports.ViewportSizeGroupOrder.indexOf(pixelWidthSizeGroup) >= exports.ViewportSizeGroupOrder.indexOf('XLARGE')
            && exports.ViewportSizeGroupOrder.indexOf(pixelHeightSizeGroup) >= exports.ViewportSizeGroupOrder.indexOf('MEDIUM')) {
            return 'TV-LANDSCAPE-XLARGE';
        }
        if (shape === 'RECTANGLE'
            && viewportOrientation === 'PORTRAIT'
            && exports.ViewportDpiGroupOrder.indexOf(viewportDpiGroup) >= exports.ViewportDpiGroupOrder.indexOf('HIGH')
            && pixelWidthSizeGroup === 'XSMALL'
            && pixelHeightSizeGroup === 'XLARGE') {
            return 'TV-PORTRAIT-MEDIUM';
        }
        if (shape === 'RECTANGLE'
            && viewportOrientation === 'LANDSCAPE'
            && exports.ViewportDpiGroupOrder.indexOf(viewportDpiGroup) >= exports.ViewportDpiGroupOrder.indexOf('HIGH')
            && pixelWidthSizeGroup === 'MEDIUM'
            && pixelHeightSizeGroup === 'SMALL') {
            return 'TV-LANDSCAPE-MEDIUM';
        }
    }
    return 'UNKNOWN-VIEWPORT-PROFILE';
}
exports.getViewportProfile = getViewportProfile;
//# sourceMappingURL=ViewportUtils.js.map

/***/ }),

/***/ 9:
/***/ ((__unused_webpack_module, exports, __webpack_require__) => {


/*
 * Copyright 2018 Amazon.com, Inc. or its affiliates. All Rights Reserved.
 * Licensed under the Apache License, Version 2.0 (the "License").
 * You may not use this file except in compliance with the License.
 * A copy of the License is located at
 *      http://www.apache.org/licenses/LICENSE-2.0
 *
 * or in the "license" file accompanying this file. This file is distributed
 * on an "AS IS" BASIS, WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either
 * express or implied. See the License for the specific language governing
 * permissions and limitations under the License.
 */
Object.defineProperty(exports, "__esModule", ({ value: true }));
exports.generateSlotsFromApiRequest = exports.isNewSession = exports.getSupportedInterfaces = exports.getSimpleSlotValues = exports.getSlotValueV2 = exports.getSlotValue = exports.getSlot = exports.getDialogState = exports.getUserId = exports.getDeviceId = exports.getApiAccessToken = exports.getAccountLinkingAccessToken = exports.getRequest = exports.getIntentName = exports.getRequestType = exports.getLocale = void 0;
const ask_sdk_runtime_1 = __webpack_require__(995);
/**
 * Retrieves the locale from the request.
 *
 * The method returns the locale value present in the request. More information about the locale can be found
 * here: https://developer.amazon.com/docs/custom-skills/request-and-response-json-reference.html#request-locale
 *
 * @param {RequestEnvelope} requestEnvelope
 * @return {string}
 */
function getLocale(requestEnvelope) {
    return requestEnvelope.request.locale;
}
exports.getLocale = getLocale;
/**
 * Retrieves the type of the request.
 *
 * The method retrieves the request type of the input request. More information about the different request
 * types are mentioned here:
 * https://developer.amazon.com/docs/custom-skills/request-and-response-json-reference.html#request-body-parameters
 *
 * @param {RequestEnvelope} requestEnvelope
 * @return {string}
 */
function getRequestType(requestEnvelope) {
    return requestEnvelope.request.type;
}
exports.getRequestType = getRequestType;
/**
 * Retrieves the name of the intent from the request.
 *
 * The method retrieves the intent name from the input request, only if the input request is an {@link IntentRequest}.
 *
 * @param {RequestEnvelope} requestEnvelope
 * @return {string}
 */
function getIntentName(requestEnvelope) {
    if (getRequestType(requestEnvelope) === 'IntentRequest') {
        return requestEnvelope.request.intent.name;
    }
    throw (0, ask_sdk_runtime_1.createAskSdkError)('RequestEnvelopeUtils', `Expecting request type of IntentRequest but got ${getRequestType(requestEnvelope)}.`);
}
exports.getIntentName = getIntentName;
/**
 * Get request object.
 *
 * We can set a specific type to the response by using the generics
 * @param {RequestEnvelope} requestEnvelope
 * @return {Request}
 * @example
 * ```
 * const intentRequest = getRequest<IntentRequest>(requestEnvelope)
 * console.log(intentRequest.intent.name)
 * ```
 */
function getRequest(requestEnvelope) {
    return requestEnvelope.request;
}
exports.getRequest = getRequest;
/**
 * Retrieves the account linking access token from the request.
 *
 * The method retrieves the user's accessToken from the input request. Once a user successfully enables a skill
 * and links their Alexa account to the skill, the input request will have the user's access token. A null value
 * is returned if there is no access token in the input request. More information on this can be found here:
 * https://developer.amazon.com/docs/account-linking/add-account-linking-logic-custom-skill.html
 *
 * @param {RequestEnvelope} requestEnvelope
 * @return {string}
 */
function getAccountLinkingAccessToken(requestEnvelope) {
    return requestEnvelope.context.System.user.accessToken;
}
exports.getAccountLinkingAccessToken = getAccountLinkingAccessToken;
/**
 * Retrieves the API access token from the request.
 *
 * The method retrieves the apiAccessToken from the input request, which has the encapsulated information of
 * permissions granted by the user. This token can be used to call Alexa-specific APIs. More information
 * about this can be found here:
 * https://developer.amazon.com/docs/custom-skills/request-and-response-json-reference.html#system-object
 *
 * The SDK automatically injects this value into service client instances retrieved from the {@link services.ServiceClientFactory}
 *
 * @param {RequestEnvelope} requestEnvelope
 * @return {string}
 */
function getApiAccessToken(requestEnvelope) {
    return requestEnvelope.context.System.apiAccessToken;
}
exports.getApiAccessToken = getApiAccessToken;
/**
 * Retrieves the device ID from the request.
 *
 * The method retrieves the deviceId property from the input request. This value uniquely identifies the device
 * and is generally used as input for some Alexa-specific API calls. More information about this can be found here:
 * https://developer.amazon.com/docs/custom-skills/request-and-response-json-reference.html#system-object
 *
 * @param {RequestEnvelope} requestEnvelope
 * @return {string}
 */
function getDeviceId(requestEnvelope) {
    return requestEnvelope.context.System.device ? requestEnvelope.context.System.device.deviceId : null;
}
exports.getDeviceId = getDeviceId;
/**
 * Retrieves the user ID from the request.
 *
 * The method retrieves the userId property from the input request. This value uniquely identifies the user
 * and is generally used as input for some Alexa-specific API calls. More information about this can be found here:
 * https://developer.amazon.com/docs/custom-skills/request-and-response-json-reference.html#system-object
 *
 * @param {RequestEnvelope} requestEnvelope
 * @return {string}
 */
function getUserId(requestEnvelope) {
    return requestEnvelope.context.System.user ? requestEnvelope.context.System.user.userId : null;
}
exports.getUserId = getUserId;
/**
 * Retrieves the dialog state from the request.
 *
 * The method retrieves the `dialogState` from the intent request, if the skill's interaction model includes a
 * dialog model. This can be used to determine the current status of user conversation and return the appropriate
 * dialog directives if the conversation is not yet complete. More information on dialog management can be found here:
 * https://developer.amazon.com/docs/custom-skills/define-the-dialog-to-collect-and-confirm-required-information.html
 *
 * @param {RequestEnvelope} requestEnvelope
 * @return {DialogState}
 */
function getDialogState(requestEnvelope) {
    if (getRequestType(requestEnvelope) === 'IntentRequest') {
        return requestEnvelope.request.dialogState;
    }
    throw (0, ask_sdk_runtime_1.createAskSdkError)('RequestEnvelopeUtils', `Expecting request type of IntentRequest but got ${getRequestType(requestEnvelope)}.`);
}
exports.getDialogState = getDialogState;
/**
 * Returns the {@link Slot} for the given slot name from the request.
 *
 * This method attempts to retrieve the requested {@link Slot} from the incoming request. If the slot does not
 * exist in the request, a null value will be returned.
 *
 * @param {RequestEnvelope} requestEnvelope
 * @param {string} slotName
 * @return {Slot}
 */
function getSlot(requestEnvelope, slotName) {
    if (getRequestType(requestEnvelope) === 'IntentRequest') {
        const slots = requestEnvelope.request.intent.slots;
        if (slots != null) {
            return slots[slotName];
        }
        return null;
    }
    throw (0, ask_sdk_runtime_1.createAskSdkError)('RequestEnvelopeUtils', `Expecting request type of IntentRequest but got ${getRequestType(requestEnvelope)}.`);
}
exports.getSlot = getSlot;
/**
 * Returns the value from the given {@link Slot} in the request.
 *
 * This method attempts to retrieve the requested {@link Slot}'s value from the incoming request. If the slot does not
 * exist in the request, a null will be returned.
 *
 * @param {RequestEnvelope} requestEnvelope
 * @param {string} slotName
 * @return {string}
 */
function getSlotValue(requestEnvelope, slotName) {
    if (getRequestType(requestEnvelope) === 'IntentRequest') {
        const slot = getSlot(requestEnvelope, slotName);
        if (slot) {
            return slot.value;
        }
        return null;
    }
    throw (0, ask_sdk_runtime_1.createAskSdkError)('RequestEnvelopeUtils', `Expecting request type of IntentRequest but got ${getRequestType(requestEnvelope)}.`);
}
exports.getSlotValue = getSlotValue;
/**
 * Returns the SlotValue from the given {@link Slot} in the request.
 *
 * SlotValue will exist for slots using multiple slot value feature. And this method attempts to retrieve the requested {@link Slot}'s SlotValue from the incoming request.
 * If the slot or slot.slotValue does not exist in the request, null will be returned.
 *
 * @param {RequestEnvelope} requestEnvelope
 * @param {string} slotName
 * @return {SlotValue}
 */
function getSlotValueV2(requestEnvelope, slotName) {
    const slot = getSlot(requestEnvelope, slotName);
    if (slot && slot.slotValue) {
        return slot.slotValue;
    }
    return null;
}
exports.getSlotValueV2 = getSlotValueV2;
/**
 * Returns all the SimpleSlotValues from the given {@link SlotValue}.
 * @param {SlotValue} slotValue
 * @return {SimpleSlotValue[]}
 */
function getSimpleSlotValues(slotValue) {
    // If the given slotValue type is SimpleSlotValue, directly return slotValue in an array
    if (slotValue.type === 'Simple') {
        return [slotValue];
    }
    // If the given slotValue type is ListSlotValue
    // Loop all the SlotValues and retrieve simpleSlotValues recursively
    if (slotValue.type === 'List' && slotValue.values) {
        return slotValue.values.reduce((simpleSlotValues, value) => simpleSlotValues.concat(getSimpleSlotValues(value)), []);
    }
    return [];
}
exports.getSimpleSlotValues = getSimpleSlotValues;
/**
 * Retrieves the {@link SupportedInterfaces} from the request.
 *
 * This method returns an object listing each interface that the device supports. For example, if
 * supportedInterfaces includes AudioPlayer, then you know that the device supports streaming audio using the
 * AudioPlayer interface.
 *
 * @param {RequestEnvelope} requestEnvelope
 * @return {SupportedInterfaces}
 */
function getSupportedInterfaces(requestEnvelope) {
    var _a, _b;
    return (_b = (_a = requestEnvelope.context.System.device) === null || _a === void 0 ? void 0 : _a.supportedInterfaces) !== null && _b !== void 0 ? _b : {};
}
exports.getSupportedInterfaces = getSupportedInterfaces;
/**
 * Returns whether the request is a new session.
 *
 * The method retrieves the new value from the input request's session, which indicates if it's a new session or
 * not. More information can be found here :
 * https://developer.amazon.com/docs/custom-skills/request-and-response-json-reference.html#session-object
 *
 * @param requestEnvelope
 */
function isNewSession(requestEnvelope) {
    const session = requestEnvelope.session;
    if (session) {
        return session.new;
    }
    throw (0, ask_sdk_runtime_1.createAskSdkError)('RequestEnvelopeUtils', `The provided request doesn't contain a session.`);
}
exports.isNewSession = isNewSession;
/**
 * Extracts slots from Dialog Api Request
 *
 *
 * @param {APIRequest} apiRequest
 */
function generateSlotsFromApiRequest(apiRequest) {
    if (!apiRequest.slots) {
        return {};
    }
    const intentSlots = {};
    Object.keys(apiRequest.slots).forEach((slotKey) => {
        const slotValue = apiRequest.slots[slotKey];
        const intentSlot = Object.assign(Object.assign({ name: slotKey, confirmationStatus: 'NONE' }, (slotValue.value ? { value: slotValue.value } : {})), (slotValue.resolutions ? { resolutions: slotValue.resolutions } : {}));
        intentSlots[slotKey] = intentSlot;
    });
    return intentSlots;
}
exports.generateSlotsFromApiRequest = generateSlotsFromApiRequest;
//# sourceMappingURL=RequestEnvelopeUtils.js.map

/***/ }),

/***/ 16:
/***/ ((module) => {

module.exports = require("url");

/***/ }),

/***/ 36:
/***/ ((__unused_webpack_module, exports) => {


/*
 * Copyright 2018 Amazon.com, Inc. or its affiliates. All Rights Reserved.
 * Licensed under the Apache License, Version 2.0 (the "License").
 * You may not use this file except in compliance with the License.
 * A copy of the License is located at
 *      http://www.apache.org/licenses/LICENSE-2.0
 *
 * or in the "license" file accompanying this file. This file is distributed
 * on an "AS IS" BASIS, WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either
 * express or implied. See the License for the specific language governing
 * permissions and limitations under the License.
 */
Object.defineProperty(exports, "__esModule", ({ value: true }));
exports.TextContentHelper = void 0;
/**
 * An abstract class responsible for building text content object using ask-sdk-model in Alexa skills kit display interface
 * https://developer.amazon.com/docs/custom-skills/display-interface-reference.html#textcontent-object-specifications.
 */
class TextContentHelper {
    /**
     * @param {string} primaryText
     * @returns {this}
     */
    withPrimaryText(primaryText) {
        this.primaryText = primaryText;
        return this;
    }
    /**
     * @param {string} secondaryText
     * @returns {this}
     */
    withSecondaryText(secondaryText) {
        this.secondaryText = secondaryText;
        return this;
    }
    /**
     * @param {string} tertiaryText
     * @returns {this}
     */
    withTertiaryText(tertiaryText) {
        this.tertiaryText = tertiaryText;
        return this;
    }
}
exports.TextContentHelper = TextContentHelper;
//# sourceMappingURL=TextContentHelper.js.map

/***/ }),

/***/ 93:
/***/ ((__unused_webpack_module, exports) => {


/*
 * Copyright 2020 Amazon.com, Inc. or its affiliates. All Rights Reserved.
 * Licensed under the Apache License, Version 2.0 (the "License").
 * You may not use this file except in compliance with the License.
 * A copy of the License is located at
 *      http://www.apache.org/licenses/LICENSE-2.0
 *
 * or in the "license" file accompanying this file. This file is distributed
 * on an "AS IS" BASIS, WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either
 * express or implied. See the License for the specific language governing
 * permissions and limitations under the License.
 */
Object.defineProperty(exports, "__esModule", ({ value: true }));
exports.UserAgentManager = void 0;
/**
 * Static manager of environment level SDK user agent information.
 */
class UserAgentManager {
    /**
     * Retrieves the full user agent string, containing all registered components.
     */
    static getUserAgent() {
        return this.userAgent;
    }
    /**
     * Registers a user agent component. This will be appended to the generated
     * user agent string. Duplicate components will be ignored.
     *
     * @param component string component to add to the full user agent
     */
    static registerComponent(component) {
        if (!this.components.has(component)) {
            this.components.add(component);
            let updatedUserAgent;
            for (const component of this.components) {
                updatedUserAgent = updatedUserAgent ? `${updatedUserAgent} ${component}` : component;
            }
            this.userAgent = updatedUserAgent;
        }
    }
}
exports.UserAgentManager = UserAgentManager;
UserAgentManager.components = new Set();
UserAgentManager.userAgent = '';
//# sourceMappingURL=UserAgentManager.js.map

/***/ }),

/***/ 114:
/***/ ((module) => {

module.exports = /*#__PURE__*/JSON.parse('{"name":"ask-sdk-core","version":"2.14.0","description":"Core package for Alexa Skills Kit SDK","main":"dist/index.js","types":"dist/index.d.ts","scripts":{"build":"tsc && npm run lint","compile":"tsc","test":"cross-env TS_NODE_FILES=true mocha -r ts-node/register \\"./tst/**/*.spec.ts\\"","lint":"eslint \\"lib/**/*.{ts,tsx}\\" \\"tst/**/*.{ts,tsx}\\"","clean":"rm -rf ./dist","reinstall":"rm -rf ./node_modules && npm install"},"author":"Amazon.com","contributors":[{"name":"Tianren Zhang","email":"tianrenz@amazon.com"},{"name":"Tiantian Xie","email":"xtiantia@amazon.com"}],"license":"Apache-2.0","keywords":["Alexa","SDK"],"dependencies":{"ask-sdk-runtime":"^2.14.0"},"peerDependencies":{"ask-sdk-model":"^1.29.0"},"devDependencies":{"@types/chai":"^4.1.2","@types/mocha":"^5.0.0","@types/node":"^16.11.1","@types/sinon":"^7.0.13","@typescript-eslint/eslint-plugin":"^3.9.0","@typescript-eslint/parser":"^3.9.0","ask-sdk-model":"^1.29.0","chai":"^4.1.2","cross-env":"^7.0.2","eslint":"^7.6.0","eslint-plugin-tsdoc":"^0.2.6","mocha":"^5.0.5","nock":"^9.2.3","nyc":"^14.1.1","sinon":"^7.0.13","ts-node":"^6.0.1","typescript":"^4.9.5"},"repository":"github:alexa/alexa-skills-kit-sdk-for-nodejs","bugs":"https://github.com/alexa/alexa-skill-sdk-for-nodejs/issues","homepage":"https://github.com/alexa/alexa-skill-sdk-for-nodejs#readme","gitHead":"f2bc5744b5240e01cef9b6f797f49408af7d984b"}');

/***/ }),

/***/ 117:
/***/ ((__unused_webpack_module, exports) => {


/*
 * Copyright 2018 Amazon.com, Inc. or its affiliates. All Rights Reserved.
 * Licensed under the Apache License, Version 2.0 (the "License").
 * You may not use this file except in compliance with the License.
 * A copy of the License is located at
 *      http://www.apache.org/licenses/LICENSE-2.0
 *
 * or in the "license" file accompanying this file. This file is distributed
 * on an "AS IS" BASIS, WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either
 * express or implied. See the License for the specific language governing
 * permissions and limitations under the License.
 */
Object.defineProperty(exports, "__esModule", ({ value: true }));
exports.ComponentInterface = void 0;
class ComponentInterface {
}
exports.ComponentInterface = ComponentInterface;
//# sourceMappingURL=ComponentInterface.js.map

/***/ }),

/***/ 138:
/***/ ((__unused_webpack_module, exports) => {


/*
 * Copyright 2018 Amazon.com, Inc. or its affiliates. All Rights Reserved.
 * Licensed under the Apache License, Version 2.0 (the "License").
 * You may not use this file except in compliance with the License.
 * A copy of the License is located at
 *      http://www.apache.org/licenses/LICENSE-2.0
 *
 * or in the "license" file accompanying this file. This file is distributed
 * on an "AS IS" BASIS, WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either
 * express or implied. See the License for the specific language governing
 * permissions and limitations under the License.
 */
Object.defineProperty(exports, "__esModule", ({ value: true }));
exports.GenericRequestMapper = void 0;
/**
 * Generic implementation for {@link RequestMapper}.
 */
class GenericRequestMapper {
    constructor(options) {
        this.requestHandlerChains = options.requestHandlerChains;
    }
    async getRequestHandlerChain(input) {
        for (const requestHandlerChain of this.requestHandlerChains) {
            const requestHandler = requestHandlerChain.getRequestHandler();
            if (await requestHandler.canHandle(input)) {
                return requestHandlerChain;
            }
        }
        return null;
    }
}
exports.GenericRequestMapper = GenericRequestMapper;
//# sourceMappingURL=GenericRequestMapper.js.map

/***/ }),

/***/ 187:
/***/ ((__unused_webpack_module, exports, __webpack_require__) => {


/*
 * Copyright 2018 Amazon.com, Inc. or its affiliates. All Rights Reserved.
 * Licensed under the Apache License, Version 2.0 (the "License").
 * You may not use this file except in compliance with the License.
 * A copy of the License is located at
 *      http://www.apache.org/licenses/LICENSE-2.0
 *
 * or in the "license" file accompanying this file. This file is distributed
 * on an "AS IS" BASIS, WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either
 * express or implied. See the License for the specific language governing
 * permissions and limitations under the License.
 */
Object.defineProperty(exports, "__esModule", ({ value: true }));
exports.CustomSkillFactory = void 0;
const BaseSkillFactory_1 = __webpack_require__(677);
/**
 * Provider for {@link CustomSkillBuilder}
 */
class CustomSkillFactory {
    static init() {
        let thisPersistenceAdapter;
        let thisApiClient;
        const baseSkillBuilder = BaseSkillFactory_1.BaseSkillFactory.init();
        return Object.assign(Object.assign({}, baseSkillBuilder), { getSkillConfiguration() {
                const skillConfiguration = baseSkillBuilder.getSkillConfiguration();
                return Object.assign(Object.assign({}, skillConfiguration), { persistenceAdapter: thisPersistenceAdapter, apiClient: thisApiClient });
            },
            withPersistenceAdapter(persistenceAdapter) {
                thisPersistenceAdapter = persistenceAdapter;
                return this;
            },
            withApiClient(apiClient) {
                thisApiClient = apiClient;
                return this;
            } });
    }
    constructor() { }
}
exports.CustomSkillFactory = CustomSkillFactory;
//# sourceMappingURL=CustomSkillFactory.js.map

/***/ }),

/***/ 237:
/***/ ((__unused_webpack_module, exports, __webpack_require__) => {


/*
 * Copyright 2018 Amazon.com, Inc. or its affiliates. All Rights Reserved.
 * Licensed under the Apache License, Version 2.0 (the "License").
 * You may not use this file except in compliance with the License.
 * A copy of the License is located at
 *      http://www.apache.org/licenses/LICENSE-2.0
 *
 * or in the "license" file accompanying this file. This file is distributed
 * on an "AS IS" BASIS, WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either
 * express or implied. See the License for the specific language governing
 * permissions and limitations under the License.
 */
Object.defineProperty(exports, "__esModule", ({ value: true }));
exports.SkillBuilders = void 0;
const CustomSkillFactory_1 = __webpack_require__(187);
/**
 * Provider for skill builders.
 */
exports.SkillBuilders = {
    custom() {
        return CustomSkillFactory_1.CustomSkillFactory.init();
    },
};
//# sourceMappingURL=SkillBuilders.js.map

/***/ }),

/***/ 266:
/***/ ((__unused_webpack_module, exports) => {


/*
 * Copyright 2018 Amazon.com, Inc. or its affiliates. All Rights Reserved.
 * Licensed under the Apache License, Version 2.0 (the "License").
 * You may not use this file except in compliance with the License.
 * A copy of the License is located at
 *      http://www.apache.org/licenses/LICENSE-2.0
 *
 * or in the "license" file accompanying this file. This file is distributed
 * on an "AS IS" BASIS, WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either
 * express or implied. See the License for the specific language governing
 * permissions and limitations under the License.
 */
Object.defineProperty(exports, "__esModule", ({ value: true }));
exports.GenericHandlerAdapter = void 0;
/**
 * Generic implementation of {@link HandlerAdapter that supports the {@link RequestHandler}}}
 */
class GenericHandlerAdapter {
    supports(handler) {
        return typeof handler.canHandle === 'function'
            && typeof handler.handle === 'function';
    }
    async execute(input, handler) {
        return handler.handle(input);
    }
}
exports.GenericHandlerAdapter = GenericHandlerAdapter;
//# sourceMappingURL=GenericHandlerAdapter.js.map

/***/ }),

/***/ 288:
/***/ ((module) => {

module.exports = {"rE":"1.86.0"};

/***/ }),

/***/ 294:
/***/ ((__unused_webpack_module, exports, __webpack_require__) => {


/*
 * Copyright 2018 Amazon.com, Inc. or its affiliates. All Rights Reserved.
 * Licensed under the Apache License, Version 2.0 (the "License").
 * You may not use this file except in compliance with the License.
 * A copy of the License is located at
 *      http://www.apache.org/licenses/LICENSE-2.0
 *
 * or in the "license" file accompanying this file. This file is distributed
 * on an "AS IS" BASIS, WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either
 * express or implied. See the License for the specific language governing
 * permissions and limitations under the License.
 */
Object.defineProperty(exports, "__esModule", ({ value: true }));
exports.egressFromComponent = exports.launchComponent = exports.ComponentInterface = exports.UserAgentManager = exports.createAskSdkUserAgent = exports.createAskSdkError = exports.isNewSession = exports.getSupportedInterfaces = exports.getSlotValue = exports.getSlot = exports.getSimpleSlotValues = exports.getRequestType = exports.getRequest = exports.getLocale = exports.getIntentName = exports.getSlotValueV2 = exports.getDialogState = exports.getUserId = exports.getDeviceId = exports.getApiAccessToken = exports.getAccountLinkingAccessToken = exports.escapeXmlCharacters = exports.ViewportSizeGroupOrder = exports.ViewportDpiGroupOrder = exports.getViewportSizeGroup = exports.getViewportProfile = exports.getViewportOrientation = exports.getViewportDpiGroup = exports.SkillBuilders = exports.CustomSkillFactory = exports.BaseSkillFactory = exports.Skill = exports.DefaultApiClient = exports.TextContentHelper = exports.RichTextContentHelper = exports.ResponseFactory = exports.PlainTextContentHelper = exports.ImageHelper = exports.DelegateToIntentHandler = exports.AttributesManagerFactory = void 0;
var AttributesManagerFactory_1 = __webpack_require__(818);
Object.defineProperty(exports, "AttributesManagerFactory", ({ enumerable: true, get: function () { return AttributesManagerFactory_1.AttributesManagerFactory; } }));
var DelegateToIntentHandler_1 = __webpack_require__(691);
Object.defineProperty(exports, "DelegateToIntentHandler", ({ enumerable: true, get: function () { return DelegateToIntentHandler_1.DelegateToIntentHandler; } }));
var ImageHelper_1 = __webpack_require__(765);
Object.defineProperty(exports, "ImageHelper", ({ enumerable: true, get: function () { return ImageHelper_1.ImageHelper; } }));
var PlainTextContentHelper_1 = __webpack_require__(882);
Object.defineProperty(exports, "PlainTextContentHelper", ({ enumerable: true, get: function () { return PlainTextContentHelper_1.PlainTextContentHelper; } }));
var ResponseFactory_1 = __webpack_require__(835);
Object.defineProperty(exports, "ResponseFactory", ({ enumerable: true, get: function () { return ResponseFactory_1.ResponseFactory; } }));
var RichTextContentHelper_1 = __webpack_require__(834);
Object.defineProperty(exports, "RichTextContentHelper", ({ enumerable: true, get: function () { return RichTextContentHelper_1.RichTextContentHelper; } }));
var TextContentHelper_1 = __webpack_require__(36);
Object.defineProperty(exports, "TextContentHelper", ({ enumerable: true, get: function () { return TextContentHelper_1.TextContentHelper; } }));
var DefaultApiClient_1 = __webpack_require__(844);
Object.defineProperty(exports, "DefaultApiClient", ({ enumerable: true, get: function () { return DefaultApiClient_1.DefaultApiClient; } }));
var CustomSkill_1 = __webpack_require__(392);
Object.defineProperty(exports, "Skill", ({ enumerable: true, get: function () { return CustomSkill_1.CustomSkill; } }));
var BaseSkillFactory_1 = __webpack_require__(677);
Object.defineProperty(exports, "BaseSkillFactory", ({ enumerable: true, get: function () { return BaseSkillFactory_1.BaseSkillFactory; } }));
var CustomSkillFactory_1 = __webpack_require__(187);
Object.defineProperty(exports, "CustomSkillFactory", ({ enumerable: true, get: function () { return CustomSkillFactory_1.CustomSkillFactory; } }));
var SkillBuilders_1 = __webpack_require__(237);
Object.defineProperty(exports, "SkillBuilders", ({ enumerable: true, get: function () { return SkillBuilders_1.SkillBuilders; } }));
var ViewportUtils_1 = __webpack_require__(8);
Object.defineProperty(exports, "getViewportDpiGroup", ({ enumerable: true, get: function () { return ViewportUtils_1.getViewportDpiGroup; } }));
Object.defineProperty(exports, "getViewportOrientation", ({ enumerable: true, get: function () { return ViewportUtils_1.getViewportOrientation; } }));
Object.defineProperty(exports, "getViewportProfile", ({ enumerable: true, get: function () { return ViewportUtils_1.getViewportProfile; } }));
Object.defineProperty(exports, "getViewportSizeGroup", ({ enumerable: true, get: function () { return ViewportUtils_1.getViewportSizeGroup; } }));
Object.defineProperty(exports, "ViewportDpiGroupOrder", ({ enumerable: true, get: function () { return ViewportUtils_1.ViewportDpiGroupOrder; } }));
Object.defineProperty(exports, "ViewportSizeGroupOrder", ({ enumerable: true, get: function () { return ViewportUtils_1.ViewportSizeGroupOrder; } }));
var SsmlUtils_1 = __webpack_require__(755);
Object.defineProperty(exports, "escapeXmlCharacters", ({ enumerable: true, get: function () { return SsmlUtils_1.escapeXmlCharacters; } }));
var RequestEnvelopeUtils_1 = __webpack_require__(9);
Object.defineProperty(exports, "getAccountLinkingAccessToken", ({ enumerable: true, get: function () { return RequestEnvelopeUtils_1.getAccountLinkingAccessToken; } }));
Object.defineProperty(exports, "getApiAccessToken", ({ enumerable: true, get: function () { return RequestEnvelopeUtils_1.getApiAccessToken; } }));
Object.defineProperty(exports, "getDeviceId", ({ enumerable: true, get: function () { return RequestEnvelopeUtils_1.getDeviceId; } }));
Object.defineProperty(exports, "getUserId", ({ enumerable: true, get: function () { return RequestEnvelopeUtils_1.getUserId; } }));
Object.defineProperty(exports, "getDialogState", ({ enumerable: true, get: function () { return RequestEnvelopeUtils_1.getDialogState; } }));
Object.defineProperty(exports, "getSlotValueV2", ({ enumerable: true, get: function () { return RequestEnvelopeUtils_1.getSlotValueV2; } }));
Object.defineProperty(exports, "getIntentName", ({ enumerable: true, get: function () { return RequestEnvelopeUtils_1.getIntentName; } }));
Object.defineProperty(exports, "getLocale", ({ enumerable: true, get: function () { return RequestEnvelopeUtils_1.getLocale; } }));
Object.defineProperty(exports, "getRequest", ({ enumerable: true, get: function () { return RequestEnvelopeUtils_1.getRequest; } }));
Object.defineProperty(exports, "getRequestType", ({ enumerable: true, get: function () { return RequestEnvelopeUtils_1.getRequestType; } }));
Object.defineProperty(exports, "getSimpleSlotValues", ({ enumerable: true, get: function () { return RequestEnvelopeUtils_1.getSimpleSlotValues; } }));
Object.defineProperty(exports, "getSlot", ({ enumerable: true, get: function () { return RequestEnvelopeUtils_1.getSlot; } }));
Object.defineProperty(exports, "getSlotValue", ({ enumerable: true, get: function () { return RequestEnvelopeUtils_1.getSlotValue; } }));
Object.defineProperty(exports, "getSupportedInterfaces", ({ enumerable: true, get: function () { return RequestEnvelopeUtils_1.getSupportedInterfaces; } }));
Object.defineProperty(exports, "isNewSession", ({ enumerable: true, get: function () { return RequestEnvelopeUtils_1.isNewSession; } }));
var ask_sdk_runtime_1 = __webpack_require__(995);
Object.defineProperty(exports, "createAskSdkError", ({ enumerable: true, get: function () { return ask_sdk_runtime_1.createAskSdkError; } }));
Object.defineProperty(exports, "createAskSdkUserAgent", ({ enumerable: true, get: function () { return ask_sdk_runtime_1.createAskSdkUserAgent; } }));
Object.defineProperty(exports, "UserAgentManager", ({ enumerable: true, get: function () { return ask_sdk_runtime_1.UserAgentManager; } }));
var ComponentInterface_1 = __webpack_require__(117);
Object.defineProperty(exports, "ComponentInterface", ({ enumerable: true, get: function () { return ComponentInterface_1.ComponentInterface; } }));
var ComponentUtils_1 = __webpack_require__(771);
Object.defineProperty(exports, "launchComponent", ({ enumerable: true, get: function () { return ComponentUtils_1.launchComponent; } }));
Object.defineProperty(exports, "egressFromComponent", ({ enumerable: true, get: function () { return ComponentUtils_1.egressFromComponent; } }));
//# sourceMappingURL=index.js.map

/***/ }),

/***/ 392:
/***/ ((__unused_webpack_module, exports, __webpack_require__) => {


/*
 * Copyright 2018 Amazon.com, Inc. or its affiliates. All Rights Reserved.
 * Licensed under the Apache License, Version 2.0 (the "License").
 * You may not use this file except in compliance with the License.
 * A copy of the License is located at
 *      http://www.apache.org/licenses/LICENSE-2.0
 *
 * or in the "license" file accompanying this file. This file is distributed
 * on an "AS IS" BASIS, WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either
 * express or implied. See the License for the specific language governing
 * permissions and limitations under the License.
 */
Object.defineProperty(exports, "__esModule", ({ value: true }));
exports.CustomSkill = void 0;
const ask_sdk_model_1 = __webpack_require__(795);
const ask_sdk_runtime_1 = __webpack_require__(995);
const AttributesManagerFactory_1 = __webpack_require__(818);
const ResponseFactory_1 = __webpack_require__(835);
var ServiceClientFactory = ask_sdk_model_1.services.ServiceClientFactory;
/**
 * Top level container for request dispatcher.
 */
class CustomSkill {
    constructor(skillConfiguration) {
        this.persistenceAdapter = skillConfiguration.persistenceAdapter;
        this.apiClient = skillConfiguration.apiClient;
        this.customUserAgent = skillConfiguration.customUserAgent;
        this.skillId = skillConfiguration.skillId;
        this.requestDispatcher = new ask_sdk_runtime_1.GenericRequestDispatcher({
            requestMappers: skillConfiguration.requestMappers,
            handlerAdapters: skillConfiguration.handlerAdapters,
            errorMapper: skillConfiguration.errorMapper,
            requestInterceptors: skillConfiguration.requestInterceptors,
            responseInterceptors: skillConfiguration.responseInterceptors,
        });
        const packageInfo = __webpack_require__(114);
        ask_sdk_runtime_1.UserAgentManager.registerComponent((0, ask_sdk_runtime_1.createAskSdkUserAgent)(packageInfo.version));
        if (this.customUserAgent) {
            ask_sdk_runtime_1.UserAgentManager.registerComponent(this.customUserAgent);
        }
    }
    /**
     * Invokes the dispatcher to handler the request envelope and construct the handler input.
     * @param requestEnvelope
     * @param context
     */
    async invoke(requestEnvelope, context) {
        if (this.skillId != null && requestEnvelope.context.System.application.applicationId !== this.skillId) {
            throw (0, ask_sdk_runtime_1.createAskSdkError)(this.constructor.name, 'CustomSkill ID verification failed!');
        }
        const input = {
            requestEnvelope,
            context,
            attributesManager: AttributesManagerFactory_1.AttributesManagerFactory.init({
                requestEnvelope,
                persistenceAdapter: this.persistenceAdapter,
            }),
            responseBuilder: ResponseFactory_1.ResponseFactory.init(),
            serviceClientFactory: this.apiClient
                ? new ServiceClientFactory({
                    apiClient: this.apiClient,
                    apiEndpoint: requestEnvelope.context.System.apiEndpoint,
                    authorizationValue: requestEnvelope.context.System.apiAccessToken,
                })
                : undefined,
        };
        const response = await this.requestDispatcher.dispatch(input);
        return {
            version: '1.0',
            response,
            userAgent: ask_sdk_runtime_1.UserAgentManager.getUserAgent(),
            sessionAttributes: requestEnvelope.session ? input.attributesManager.getSessionAttributes() : undefined,
        };
    }
    /**
     * Determines if the skill can support the specific request type.
     * @param input
     * @param context
     */
    supports(input, context) {
        return !!input.request;
    }
    /**
     * Append additional user agent info
     * @param userAgent
     */
    appendAdditionalUserAgent(userAgent) {
        ask_sdk_runtime_1.UserAgentManager.registerComponent(userAgent);
    }
}
exports.CustomSkill = CustomSkill;
//# sourceMappingURL=CustomSkill.js.map

/***/ }),

/***/ 414:
/***/ ((__unused_webpack_module, exports, __webpack_require__) => {


/*
 * Copyright 2018 Amazon.com, Inc. or its affiliates. All Rights Reserved.
 * Licensed under the Apache License, Version 2.0 (the "License").
 * You may not use this file except in compliance with the License.
 * A copy of the License is located at
 *      http://www.apache.org/licenses/LICENSE-2.0
 *
 * or in the "license" file accompanying this file. This file is distributed
 * on an "AS IS" BASIS, WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either
 * express or implied. See the License for the specific language governing
 * permissions and limitations under the License.
 */
Object.defineProperty(exports, "__esModule", ({ value: true }));
exports.GenericRequestDispatcher = void 0;
const AskSdkUtils_1 = __webpack_require__(976);
/**
 * Generic implementation of {@link RequestDispatcher}.
 * @param Input generic type for input object sent to handler.
 * @param Output generic type for the handler return value.
 */
class GenericRequestDispatcher {
    constructor(options) {
        this.requestMappers = options.requestMappers;
        this.handlerAdapters = options.handlerAdapters;
        this.errorMapper = options.errorMapper;
        this.requestInterceptors = options.requestInterceptors;
        this.responseInterceptors = options.responseInterceptors;
    }
    /**
     * Main entry point for dispatching logic.
     * Dispatches handlerInput to requestHandlers and error, if any, to errorHandlers
     * @param input
     */
    async dispatch(input) {
        let output;
        try {
            // Execute global request interceptors
            if (this.requestInterceptors) {
                for (const requestInterceptor of this.requestInterceptors) {
                    await requestInterceptor.process(input);
                }
            }
            // Dispatch request to handler chain
            output = await this.dispatchRequest(input);
            // Execute global response interceptors
            if (this.responseInterceptors) {
                for (const responseInterceptor of this.responseInterceptors) {
                    await responseInterceptor.process(input, output);
                }
            }
        }
        catch (err) {
            output = await this.dispatchError(input, err);
        }
        return output;
    }
    /**
     * Main logic for request dispatching.
     * @param input
     */
    async dispatchRequest(input) {
        // Get the request handler chain that can handle the request
        let handlerChain;
        for (const requestMapper of this.requestMappers) {
            handlerChain = await requestMapper.getRequestHandlerChain(input);
            if (handlerChain) {
                break;
            }
        }
        if (!handlerChain) {
            throw (0, AskSdkUtils_1.createAskSdkError)(this.constructor.name, `Unable to find a suitable request handler.`);
        }
        // Extract the handler and interceptors from the handler chain
        const handler = handlerChain.getRequestHandler();
        const requestInterceptors = handlerChain.getRequestInterceptors();
        const responseInterceptors = handlerChain.getResponseInterceptors();
        let adapter;
        for (const handlerAdapter of this.handlerAdapters) {
            if (handlerAdapter.supports(handler)) {
                adapter = handlerAdapter;
                break;
            }
        }
        if (!adapter) {
            throw (0, AskSdkUtils_1.createAskSdkError)(this.constructor.name, `Unable to find a suitable handler adapter.`);
        }
        // Execute request interceptors that are local to the handler chain
        if (requestInterceptors) {
            for (const requestInterceptor of requestInterceptors) {
                await requestInterceptor.process(input);
            }
        }
        // Invoke the request handler
        const output = await adapter.execute(input, handler);
        // Execute response interceptors that are local to the handler chain
        if (responseInterceptors) {
            for (const responseInterceptor of responseInterceptors) {
                await responseInterceptor.process(input, output);
            }
        }
        return output;
    }
    /**
     * Main logic for error dispatching.
     * @param input
     * @param error
     */
    async dispatchError(input, error) {
        if (this.errorMapper) {
            const handler = await this.errorMapper.getErrorHandler(input, error);
            if (handler) {
                return handler.handle(input, error);
            }
        }
        throw error;
    }
}
exports.GenericRequestDispatcher = GenericRequestDispatcher;
//# sourceMappingURL=GenericRequestDispatcher.js.map

/***/ }),

/***/ 611:
/***/ ((module) => {

module.exports = require("http");

/***/ }),

/***/ 677:
/***/ ((__unused_webpack_module, exports, __webpack_require__) => {


/*
 * Copyright 2018 Amazon.com, Inc. or its affiliates. All Rights Reserved.
 * Licensed under the Apache License, Version 2.0 (the "License").
 * You may not use this file except in compliance with the License.
 * A copy of the License is located at
 *      http://www.apache.org/licenses/LICENSE-2.0
 *
 * or in the "license" file accompanying this file. This file is distributed
 * on an "AS IS" BASIS, WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either
 * express or implied. See the License for the specific language governing
 * permissions and limitations under the License.
 */
Object.defineProperty(exports, "__esModule", ({ value: true }));
exports.BaseSkillFactory = void 0;
const ask_sdk_runtime_1 = __webpack_require__(995);
const CustomSkill_1 = __webpack_require__(392);
class BaseSkillFactory {
    static init() {
        const runtimeConfigurationBuilder = new ask_sdk_runtime_1.RuntimeConfigurationBuilder();
        let thisCustomUserAgent;
        let thisSkillId;
        return {
            addRequestHandler(matcher, executor) {
                const canHandle = typeof matcher === 'string'
                    ? ({ requestEnvelope }) => matcher === (requestEnvelope.request.type === 'IntentRequest'
                        ? requestEnvelope.request.intent.name
                        : requestEnvelope.request.type)
                    : matcher;
                runtimeConfigurationBuilder.addRequestHandler(canHandle, executor);
                return this;
            },
            addRequestHandlers(...requestHandlers) {
                runtimeConfigurationBuilder.addRequestHandlers(...requestHandlers);
                return this;
            },
            addRequestInterceptors(...executors) {
                runtimeConfigurationBuilder.addRequestInterceptors(...executors);
                return this;
            },
            addResponseInterceptors(...executors) {
                runtimeConfigurationBuilder.addResponseInterceptors(...executors);
                return this;
            },
            addErrorHandler(matcher, executor) {
                runtimeConfigurationBuilder.addErrorHandler(matcher, executor);
                return this;
            },
            addErrorHandlers(...errorHandlers) {
                runtimeConfigurationBuilder.addErrorHandlers(...errorHandlers);
                return this;
            },
            withCustomUserAgent(customUserAgent) {
                thisCustomUserAgent = customUserAgent;
                return this;
            },
            withSkillId(skillId) {
                thisSkillId = skillId;
                return this;
            },
            getSkillConfiguration() {
                const runtimeConfiguration = runtimeConfigurationBuilder.getRuntimeConfiguration();
                return Object.assign(Object.assign({}, runtimeConfiguration), { customUserAgent: thisCustomUserAgent, skillId: thisSkillId });
            },
            create() {
                return new CustomSkill_1.CustomSkill(this.getSkillConfiguration());
            },
            lambda() {
                const skill = new CustomSkill_1.CustomSkill(this.getSkillConfiguration());
                return (event, context, callback) => {
                    skill.invoke(event, context)
                        .then((response) => {
                        callback(null, response);
                    })
                        .catch((err) => {
                        callback(err, null);
                    });
                };
            },
        };
    }
    constructor() { }
}
exports.BaseSkillFactory = BaseSkillFactory;
//# sourceMappingURL=BaseSkillFactory.js.map

/***/ }),

/***/ 691:
/***/ ((__unused_webpack_module, exports, __webpack_require__) => {


/*
 * Copyright 2018 Amazon.com, Inc. or its affiliates. All Rights Reserved.
 * Licensed under the Apache License, Version 2.0 (the "License").
 * You may not use this file except in compliance with the License.
 * A copy of the License is located at
 *      http://www.apache.org/licenses/LICENSE-2.0
 *
 * or in the "license" file accompanying this file. This file is distributed
 * on an "AS IS" BASIS, WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either
 * express or implied. See the License for the specific language governing
 * permissions and limitations under the License.
 */
Object.defineProperty(exports, "__esModule", ({ value: true }));
exports.DelegateToIntentHandler = void 0;
const RequestEnvelopeUtils_1 = __webpack_require__(9);
const ACDL_AUTOGEN_NAMESPACE = "com.amazon.autogenerated";
const SPLIT_CHAR = "_";
class DelegateToIntentHandler {
    canHandle(input) {
        if ((0, RequestEnvelopeUtils_1.getRequestType)(input.requestEnvelope) !== 'Dialog.API.Invoked') {
            return false;
        }
        if (!input.requestEnvelope.request.apiRequest
            || !input.requestEnvelope.request.apiRequest.name) {
            return false;
        }
        const apiName = input.requestEnvelope.request.apiRequest.name;
        if (!apiName.startsWith(ACDL_AUTOGEN_NAMESPACE)) {
            return false;
        }
        return true;
    }
    handle(input) {
        const apiRequest = input.requestEnvelope.request.apiRequest;
        const apiName = apiRequest.name;
        const intentName = (apiName.substring(apiName.indexOf(SPLIT_CHAR) + 1));
        const directiveType = "Dialog.DelegateRequest";
        const delegationTarget = "skill";
        const updatedRequestType = "IntentRequest";
        const delegationPeriod = {
            until: 'EXPLICIT_RETURN'
        };
        const intent = {
            name: intentName,
            confirmationStatus: 'NONE',
            slots: (0, RequestEnvelopeUtils_1.generateSlotsFromApiRequest)(apiRequest)
        };
        const updatedRequest = {
            type: updatedRequestType,
            intent
        };
        const delegateRequestDirective = {
            type: directiveType,
            target: delegationTarget,
            period: delegationPeriod,
            updatedRequest
        };
        return input.responseBuilder.addDirective(delegateRequestDirective).getResponse();
    }
}
exports.DelegateToIntentHandler = DelegateToIntentHandler;
//# sourceMappingURL=DelegateToIntentHandler.js.map

/***/ }),

/***/ 692:
/***/ ((module) => {

module.exports = require("https");

/***/ }),

/***/ 712:
/***/ ((__unused_webpack_module, exports, __webpack_require__) => {


/*
 * Copyright 2018 Amazon.com, Inc. or its affiliates. All Rights Reserved.
 * Licensed under the Apache License, Version 2.0 (the "License").
 * You may not use this file except in compliance with the License.
 * A copy of the License is located at
 *      http://www.apache.org/licenses/LICENSE-2.0
 *
 * or in the "license" file accompanying this file. This file is distributed
 * on an "AS IS" BASIS, WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either
 * express or implied. See the License for the specific language governing
 * permissions and limitations under the License.
 */
Object.defineProperty(exports, "__esModule", ({ value: true }));
exports.RuntimeConfigurationBuilder = void 0;
const GenericErrorMapper_1 = __webpack_require__(874);
const GenericHandlerAdapter_1 = __webpack_require__(266);
const GenericRequestHandlerChain_1 = __webpack_require__(989);
const GenericRequestMapper_1 = __webpack_require__(138);
const AskSdkUtils_1 = __webpack_require__(976);
class RuntimeConfigurationBuilder {
    constructor() {
        this.requestHandlerChains = [];
        this.requestInterceptors = [];
        this.responseInterceptors = [];
        this.errorHandlers = [];
    }
    addRequestHandler(matcher, executor) {
        if (typeof matcher !== 'function' || typeof executor !== 'function') {
            throw (0, AskSdkUtils_1.createAskSdkError)(this.constructor.name, `Incompatible matcher type: ${typeof matcher}`);
        }
        this.requestHandlerChains.push(new GenericRequestHandlerChain_1.GenericRequestHandlerChain({
            requestHandler: {
                canHandle: matcher,
                handle: executor,
            },
        }));
        return this;
    }
    addRequestHandlers(...requestHandlers) {
        for (const requestHandler of requestHandlers) {
            this.requestHandlerChains.push(new GenericRequestHandlerChain_1.GenericRequestHandlerChain({
                requestHandler,
            }));
        }
        return this;
    }
    addRequestInterceptors(...executors) {
        for (const executor of executors) {
            switch (typeof executor) {
                case 'object': {
                    this.requestInterceptors.push(executor);
                    break;
                }
                case 'function': {
                    this.requestInterceptors.push({
                        process: executor,
                    });
                    break;
                }
                default: {
                    throw (0, AskSdkUtils_1.createAskSdkError)(this.constructor.name, `Incompatible executor type: ${typeof executor}`);
                }
            }
        }
        return this;
    }
    addResponseInterceptors(...executors) {
        for (const executor of executors) {
            switch (typeof executor) {
                case 'object': {
                    this.responseInterceptors.push(executor);
                    break;
                }
                case 'function': {
                    this.responseInterceptors.push({
                        process: executor,
                    });
                    break;
                }
                default: {
                    throw (0, AskSdkUtils_1.createAskSdkError)('SkillBuilderError', `Incompatible executor type: ${typeof executor}`);
                }
            }
        }
        return this;
    }
    addErrorHandler(matcher, executor) {
        this.errorHandlers.push({
            canHandle: matcher,
            handle: executor,
        });
        return this;
    }
    addErrorHandlers(...errorHandlers) {
        this.errorHandlers.push(...errorHandlers);
        return this;
    }
    getRuntimeConfiguration() {
        const requestMapper = new GenericRequestMapper_1.GenericRequestMapper({
            requestHandlerChains: this.requestHandlerChains,
        });
        const errorMapper = this.errorHandlers.length
            ? new GenericErrorMapper_1.GenericErrorMapper({
                errorHandlers: this.errorHandlers,
            })
            : undefined;
        return {
            requestMappers: [requestMapper],
            handlerAdapters: [new GenericHandlerAdapter_1.GenericHandlerAdapter()],
            errorMapper,
            requestInterceptors: this.requestInterceptors,
            responseInterceptors: this.responseInterceptors,
        };
    }
}
exports.RuntimeConfigurationBuilder = RuntimeConfigurationBuilder;
//# sourceMappingURL=RuntimeConfigurationBuilder.js.map

/***/ }),

/***/ 755:
/***/ ((__unused_webpack_module, exports) => {


/*
 * Copyright 2018 Amazon.com, Inc. or its affiliates. All Rights Reserved.
 * Licensed under the Apache License, Version 2.0 (the "License").
 * You may not use this file except in compliance with the License.
 * A copy of the License is located at
 *      http://www.apache.org/licenses/LICENSE-2.0
 *
 * or in the "license" file accompanying this file. This file is distributed
 * on an "AS IS" BASIS, WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either
 * express or implied. See the License for the specific language governing
 * permissions and limitations under the License.
 */
Object.defineProperty(exports, "__esModule", ({ value: true }));
exports.escapeXmlCharacters = void 0;
/**
 * return the string with all invalid XML characters escaped
 * @param input
 */
function escapeXmlCharacters(input) {
    const invalidXmlCharactersMapping = {
        '&': '&amp;',
        '<': '&lt;',
        '>': '&gt;',
        '"': '&quot;',
        "'": '&apos;',
    };
    const invalidXmlCharactersMappingReverse = Object.keys(invalidXmlCharactersMapping).reduce(
    /* eslint-disable-next-line */
    (obj, key) => {
        obj[invalidXmlCharactersMapping[key]] = key;
        return obj;
    }, {});
    // sanitize any already escaped character to ensure they are not escaped more than once
    const sanitizedInput = input.replace(/&amp;|&lt;|&gt;|&quot;|&apos;]/g, (c) => invalidXmlCharactersMappingReverse[c]);
    return sanitizedInput.replace(/[&'"><]/g, (c) => invalidXmlCharactersMapping[c]);
}
exports.escapeXmlCharacters = escapeXmlCharacters;
//# sourceMappingURL=SsmlUtils.js.map

/***/ }),

/***/ 765:
/***/ ((__unused_webpack_module, exports) => {


/*
 * Copyright 2018 Amazon.com, Inc. or its affiliates. All Rights Reserved.
 * Licensed under the Apache License, Version 2.0 (the "License").
 * You may not use this file except in compliance with the License.
 * A copy of the License is located at
 *      http://www.apache.org/licenses/LICENSE-2.0
 *
 * or in the "license" file accompanying this file. This file is distributed
 * on an "AS IS" BASIS, WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either
 * express or implied. See the License for the specific language governing
 * permissions and limitations under the License.
 */
Object.defineProperty(exports, "__esModule", ({ value: true }));
exports.ImageHelper = void 0;
/**
 * Responsible for building image object using ask-sdk-model in Alexa skills kit display interface
 * https://developer.amazon.com/docs/custom-skills/display-interface-reference.html#image-object-specifications.
 */
class ImageHelper {
    constructor() {
        this.image = {};
    }
    /**
     * Sets content description in image object
     * @param {string} description text used to describe the image for a screen reader
     * @returns {ImageHelper}
     */
    withDescription(description) {
        this.image.contentDescription = description;
        return this;
    }
    /**
     * Add image instance in image object
     * @param {string} url source of the image
     * @param {interfaces.display.ImageSize} size  size of the image. Accepted values:
     * X_SMALL: Displayed within extra small containers
     * SMALL: Displayed within small  containers
     * MEDIUM: Displayed within medium containers
     * LARGE: Displayed within large containers
     * X_LARGE Displayed within extra large containers
     * By default, for Echo Show, size takes the value X_SMALL. If the other size values are included,
     * then the order of precedence for displaying images begins with X_LARGE and proceeds downward,
     * which means that larger images will be downscaled for display on Echo Show if provided.
     * For the best user experience, include the appropriately sized image, and do not include larger images.
     * @param {number} widthPixels widthPixels of the image
     * @param {number} heightPixels heightPixels of the image
     * @returns {ImageHelper}
     */
    addImageInstance(url, size, widthPixels, heightPixels) {
        const imageInstance = {
            url,
        };
        if (size) {
            imageInstance.size = size;
        }
        if (heightPixels) {
            imageInstance.heightPixels = heightPixels;
        }
        if (widthPixels) {
            imageInstance.widthPixels = widthPixels;
        }
        if (!this.image.sources) {
            this.image.sources = [imageInstance];
        }
        else {
            this.image.sources.push(imageInstance);
        }
        return this;
    }
    /**
     * @returns {Image}
     */
    getImage() {
        return this.image;
    }
}
exports.ImageHelper = ImageHelper;
//# sourceMappingURL=ImageHelper.js.map

/***/ }),

/***/ 771:
/***/ ((__unused_webpack_module, exports, __webpack_require__) => {


/*
 * Copyright 2018 Amazon.com, Inc. or its affiliates. All Rights Reserved.
 * Licensed under the Apache License, Version 2.0 (the "License").
 * You may not use this file except in compliance with the License.
 * A copy of the License is located at
 *      http://www.apache.org/licenses/LICENSE-2.0
 *
 * or in the "license" file accompanying this file. This file is distributed
 * on an "AS IS" BASIS, WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either
 * express or implied. See the License for the specific language governing
 * permissions and limitations under the License.
 */
Object.defineProperty(exports, "__esModule", ({ value: true }));
exports.egressFromComponent = exports.launchComponent = void 0;
const ask_sdk_runtime_1 = __webpack_require__(995);
const RequestEnvelopeUtils_1 = __webpack_require__(9);
function launchComponent(options) {
    const directiveType = "Dialog.DelegateRequest";
    const delegationTarget = "AMAZON.Conversations";
    const updatedRequestType = "Dialog.InputRequest";
    const delegationPeriod = {
        until: 'EXPLICIT_RETURN'
    };
    if (!options || options.isUserUtteranceInput || !options.utteranceSetName) {
        const delegateRequestDirective = {
            type: directiveType,
            target: delegationTarget,
            period: delegationPeriod
        };
        return delegateRequestDirective;
    }
    const dialogInput = {
        name: options.utteranceSetName,
        slots: options.slots || {}
    };
    const updatedRequest = {
        type: updatedRequestType,
        input: dialogInput
    };
    const delegateRequestDirective = {
        type: directiveType,
        target: delegationTarget,
        period: delegationPeriod,
        updatedRequest
    };
    return delegateRequestDirective;
}
exports.launchComponent = launchComponent;
function egressFromComponent(actionName, egressInput) {
    if (!egressInput.intentName && !egressInput.handle) {
        throw (0, ask_sdk_runtime_1.createAskSdkError)("ComponentUtils", "No intentName or handle callback provided for egressing from skill component");
    }
    const directiveType = "Dialog.DelegateRequest";
    const delegationTarget = "skill";
    const updatedRequestType = "IntentRequest";
    const delegationPeriod = {
        until: 'EXPLICIT_RETURN'
    };
    const skillRequestType = 'Dialog.API.Invoked';
    const delegateToIntentHandler = {
        canHandle(input) {
            return (0, RequestEnvelopeUtils_1.getRequestType)(input.requestEnvelope) === skillRequestType
                && input.requestEnvelope.request.apiRequest.name === actionName;
        },
        handle(input) {
            if (egressInput.handle) {
                return egressInput.handle(input);
            }
            const intent = {
                name: egressInput.intentName,
                confirmationStatus: 'NONE'
            };
            const updatedRequest = {
                type: updatedRequestType,
                intent
            };
            const delegateRequestDirective = {
                type: directiveType,
                target: delegationTarget,
                period: delegationPeriod,
                updatedRequest
            };
            return input.responseBuilder.addDirective(delegateRequestDirective).getResponse();
        }
    };
    return delegateToIntentHandler;
}
exports.egressFromComponent = egressFromComponent;
//# sourceMappingURL=ComponentUtils.js.map

/***/ }),

/***/ 795:
/***/ (function(__unused_webpack_module, exports, __webpack_require__) {


var __extends = (this && this.__extends) || (function () {
    var extendStatics = function (d, b) {
        extendStatics = Object.setPrototypeOf ||
            ({ __proto__: [] } instanceof Array && function (d, b) { d.__proto__ = b; }) ||
            function (d, b) { for (var p in b) if (b.hasOwnProperty(p)) d[p] = b[p]; };
        return extendStatics(d, b);
    };
    return function (d, b) {
        extendStatics(d, b);
        function __() { this.constructor = d; }
        d.prototype = b === null ? Object.create(b) : (__.prototype = b.prototype, new __());
    };
})();
var __awaiter = (this && this.__awaiter) || function (thisArg, _arguments, P, generator) {
    return new (P || (P = Promise))(function (resolve, reject) {
        function fulfilled(value) { try { step(generator.next(value)); } catch (e) { reject(e); } }
        function rejected(value) { try { step(generator["throw"](value)); } catch (e) { reject(e); } }
        function step(result) { result.done ? resolve(result.value) : new P(function (resolve) { resolve(result.value); }).then(fulfilled, rejected); }
        step((generator = generator.apply(thisArg, _arguments || [])).next());
    });
};
var __generator = (this && this.__generator) || function (thisArg, body) {
    var _ = { label: 0, sent: function() { if (t[0] & 1) throw t[1]; return t[1]; }, trys: [], ops: [] }, f, y, t, g;
    return g = { next: verb(0), "throw": verb(1), "return": verb(2) }, typeof Symbol === "function" && (g[Symbol.iterator] = function() { return this; }), g;
    function verb(n) { return function (v) { return step([n, v]); }; }
    function step(op) {
        if (f) throw new TypeError("Generator is already executing.");
        while (_) try {
            if (f = 1, y && (t = op[0] & 2 ? y["return"] : op[0] ? y["throw"] || ((t = y["return"]) && t.call(y), 0) : y.next) && !(t = t.call(y, op[1])).done) return t;
            if (y = 0, t) op = [op[0] & 2, t.value];
            switch (op[0]) {
                case 0: case 1: t = op; break;
                case 4: _.label++; return { value: op[1], done: false };
                case 5: _.label++; y = op[1]; op = [0]; continue;
                case 7: op = _.ops.pop(); _.trys.pop(); continue;
                default:
                    if (!(t = _.trys, t = t.length > 0 && t[t.length - 1]) && (op[0] === 6 || op[0] === 2)) { _ = 0; continue; }
                    if (op[0] === 3 && (!t || (op[1] > t[0] && op[1] < t[3]))) { _.label = op[1]; break; }
                    if (op[0] === 6 && _.label < t[1]) { _.label = t[1]; t = op; break; }
                    if (t && _.label < t[2]) { _.label = t[2]; _.ops.push(op); break; }
                    if (t[2]) _.ops.pop();
                    _.trys.pop(); continue;
            }
            op = body.call(thisArg, _);
        } catch (e) { op = [6, e]; y = 0; } finally { f = t = 0; }
        if (op[0] & 5) throw op[1]; return { value: op[0] ? op[1] : void 0, done: true };
    }
};
Object.defineProperty(exports, "__esModule", ({ value: true }));
var services;
(function (services) {
    /**
     * Class to be used as the base class for the generated service clients.
     */
    var BaseServiceClient = /** @class */ (function () {
        /**
         * Creates new instance of the BaseServiceClient
         * @param {ApiConfiguration} apiConfiguration configuration parameter to provide dependencies to service client instance
         */
        function BaseServiceClient(apiConfiguration) {
            this.requestInterceptors = [];
            this.responseInterceptors = [];
            this.apiConfiguration = apiConfiguration;
        }
        BaseServiceClient.isCodeSuccessful = function (responseCode) {
            return responseCode >= 200 && responseCode < 300;
        };
        BaseServiceClient.buildUrl = function (endpoint, path, queryParameters, pathParameters) {
            var processedEndpoint = endpoint.endsWith('/') ? endpoint.substr(0, endpoint.length - 1) : endpoint;
            var pathWithParams = this.interpolateParams(path, pathParameters);
            var isConstantQueryPresent = pathWithParams.includes('?');
            var queryString = this.buildQueryString(queryParameters, isConstantQueryPresent);
            return processedEndpoint + pathWithParams + queryString;
        };
        BaseServiceClient.interpolateParams = function (path, params) {
            if (!params) {
                return path;
            }
            var result = path;
            params.forEach(function (paramValue, paramName) {
                result = result.replace('{' + paramName + '}', encodeURIComponent(paramValue));
            });
            return result;
        };
        BaseServiceClient.buildQueryString = function (params, isQueryStart) {
            if (!params) {
                return '';
            }
            var sb = [];
            if (isQueryStart) {
                sb.push('&');
            }
            else {
                sb.push('?');
            }
            params.forEach(function (obj) {
                sb.push(encodeURIComponent(obj.key));
                sb.push('=');
                sb.push(encodeURIComponent(obj.value));
                sb.push('&');
            });
            sb.pop();
            return sb.join('');
        };
        /**
         * Sets array of functions that is going to be executed before the request is send
         * @param {Function} requestInterceptor request interceptor function
         * @returns {BaseServiceClient}
         */
        BaseServiceClient.prototype.withRequestInterceptors = function () {
            var requestInterceptors = [];
            for (var _i = 0; _i < arguments.length; _i++) {
                requestInterceptors[_i] = arguments[_i];
            }
            for (var _a = 0, requestInterceptors_1 = requestInterceptors; _a < requestInterceptors_1.length; _a++) {
                var interceptor = requestInterceptors_1[_a];
                this.requestInterceptors.push(interceptor);
            }
            return this;
        };
        /**
         * Sets array of functions that is going to be executed after the request is send
         * @param {Function} responseInterceptor response interceptor function
         * @returns {BaseServiceClient}
         */
        BaseServiceClient.prototype.withResponseInterceptors = function () {
            var responseInterceptors = [];
            for (var _i = 0; _i < arguments.length; _i++) {
                responseInterceptors[_i] = arguments[_i];
            }
            for (var _a = 0, responseInterceptors_1 = responseInterceptors; _a < responseInterceptors_1.length; _a++) {
                var interceptor = responseInterceptors_1[_a];
                this.responseInterceptors.push(interceptor);
            }
            return this;
        };
        /**
         * Invocation wrapper to implement service operations in generated classes
         * @param method HTTP method, such as 'POST', 'GET', 'DELETE', etc.
         * @param endpoint base API url
         * @param path the path pattern with possible placeholders for path parameters in form {paramName}
         * @param pathParams path parameters collection
         * @param queryParams query parameters collection
         * @param headerParams headers collection
         * @param bodyParam if body parameter is present it is provided here, otherwise null or undefined
         * @param errors maps recognized status codes to messages
         * @param nonJsonBody if the body is in JSON format
         */
        BaseServiceClient.prototype.invoke = function (method, endpoint, path, pathParams, queryParams, headerParams, bodyParam, errors, nonJsonBody) {
            return __awaiter(this, void 0, void 0, function () {
                var request, apiClient, response, _i, _a, requestInterceptor, _b, _c, responseInterceptor, err_1, body, contentType, isJson, apiResponse, err;
                return __generator(this, function (_d) {
                    switch (_d.label) {
                        case 0:
                            request = {
                                url: BaseServiceClient.buildUrl(endpoint, path, queryParams, pathParams),
                                method: method,
                                headers: headerParams,
                            };
                            if (bodyParam != null) {
                                request.body = nonJsonBody ? bodyParam : JSON.stringify(bodyParam);
                            }
                            apiClient = this.apiConfiguration.apiClient;
                            _d.label = 1;
                        case 1:
                            _d.trys.push([1, 11, , 12]);
                            _i = 0, _a = this.requestInterceptors;
                            _d.label = 2;
                        case 2:
                            if (!(_i < _a.length)) return [3 /*break*/, 5];
                            requestInterceptor = _a[_i];
                            return [4 /*yield*/, requestInterceptor(request)];
                        case 3:
                            _d.sent();
                            _d.label = 4;
                        case 4:
                            _i++;
                            return [3 /*break*/, 2];
                        case 5: return [4 /*yield*/, apiClient.invoke(request)];
                        case 6:
                            response = _d.sent();
                            _b = 0, _c = this.responseInterceptors;
                            _d.label = 7;
                        case 7:
                            if (!(_b < _c.length)) return [3 /*break*/, 10];
                            responseInterceptor = _c[_b];
                            return [4 /*yield*/, responseInterceptor(response)];
                        case 8:
                            _d.sent();
                            _d.label = 9;
                        case 9:
                            _b++;
                            return [3 /*break*/, 7];
                        case 10: return [3 /*break*/, 12];
                        case 11:
                            err_1 = _d.sent();
                            err_1.message = "Call to service failed: " + err_1.message;
                            throw err_1;
                        case 12:
                            try {
                                contentType = response.headers.find(function (h) { return h.key === 'content-type'; });
                                isJson = !contentType || contentType.value.includes('application/json');
                                body = response.body && isJson ? JSON.parse(response.body) : response.body;
                                // converting to undefined if empty string
                                body = body || undefined;
                            }
                            catch (err) {
                                throw new SyntaxError("Failed trying to parse the response body: " + response.body);
                            }
                            if (BaseServiceClient.isCodeSuccessful(response.statusCode)) {
                                apiResponse = {
                                    headers: response.headers,
                                    body: body,
                                    statusCode: response.statusCode,
                                };
                                return [2 /*return*/, apiResponse];
                            }
                            err = new Error('Unknown error');
                            err.name = 'ServiceError';
                            err['statusCode'] = response.statusCode; // tslint:disable-line:no-string-literal
                            err['response'] = body; // tslint:disable-line:no-string-literal
                            if (errors && errors.has(response.statusCode)) {
                                err.message = errors.get(response.statusCode);
                            }
                            throw err;
                    }
                });
            });
        };
        return BaseServiceClient;
    }());
    services.BaseServiceClient = BaseServiceClient;
    /**
     * Class to be used to call Amazon LWA to retrieve access tokens.
     */
    var LwaServiceClient = /** @class */ (function (_super) {
        __extends(LwaServiceClient, _super);
        function LwaServiceClient(options) {
            var _this = _super.call(this, options.apiConfiguration) || this;
            if (options.authenticationConfiguration == null) {
                throw new Error('AuthenticationConfiguration cannot be null or undefined.');
            }
            _this.grantType = options.grantType ? options.grantType : LwaServiceClient.CLIENT_CREDENTIALS_GRANT_TYPE;
            _this.authenticationConfiguration = options.authenticationConfiguration;
            _this.tokenStore = {};
            return _this;
        }
        LwaServiceClient.prototype.getAccessTokenForScope = function (scope) {
            return __awaiter(this, void 0, void 0, function () {
                return __generator(this, function (_a) {
                    if (scope == null) {
                        throw new Error('Scope cannot be null or undefined.');
                    }
                    return [2 /*return*/, this.getAccessToken(scope)];
                });
            });
        };
        LwaServiceClient.prototype.getAccessToken = function (scope) {
            return __awaiter(this, void 0, void 0, function () {
                var cacheKey, accessToken, accessTokenRequest, accessTokenResponse;
                return __generator(this, function (_a) {
                    switch (_a.label) {
                        case 0:
                            cacheKey = scope ? scope : LwaServiceClient.REFRESH_ACCESS_TOKEN;
                            accessToken = this.tokenStore[cacheKey];
                            if (accessToken && accessToken.expiry > Date.now() + LwaServiceClient.EXPIRY_OFFSET_MILLIS) {
                                return [2 /*return*/, accessToken.token];
                            }
                            accessTokenRequest = {
                                clientId: this.authenticationConfiguration.clientId,
                                clientSecret: this.authenticationConfiguration.clientSecret,
                            };
                            if (scope && this.authenticationConfiguration.refreshToken) {
                                throw new Error('Cannot support both refreshToken and scope.');
                            }
                            else if (scope == null && this.authenticationConfiguration.refreshToken == null) {
                                throw new Error('Either refreshToken or scope must be specified.');
                            }
                            else if (scope == null) {
                                accessTokenRequest.refreshToken = this.authenticationConfiguration.refreshToken;
                            }
                            else {
                                accessTokenRequest.scope = scope;
                            }
                            return [4 /*yield*/, this.generateAccessToken(accessTokenRequest)];
                        case 1:
                            accessTokenResponse = _a.sent();
                            this.tokenStore[cacheKey] = {
                                token: accessTokenResponse.access_token,
                                expiry: Date.now() + accessTokenResponse.expires_in * 1000,
                            };
                            return [2 /*return*/, accessTokenResponse.access_token];
                    }
                });
            });
        };
        LwaServiceClient.prototype.generateAccessToken = function (accessTokenRequest) {
            return __awaiter(this, void 0, void 0, function () {
                var authEndpoint, queryParams, headerParams, pathParams, paramInfo, bodyParams, errorDefinitions, apiResponse;
                return __generator(this, function (_a) {
                    switch (_a.label) {
                        case 0:
                            authEndpoint = this.authenticationConfiguration.authEndpoint || LwaServiceClient.AUTH_ENDPOINT;
                            if (accessTokenRequest == null) {
                                throw new Error("Required parameter accessTokenRequest was null or undefined when calling generateAccessToken.");
                            }
                            queryParams = [];
                            headerParams = [];
                            headerParams.push({ key: 'Content-type', value: 'application/x-www-form-urlencoded' });
                            pathParams = new Map();
                            paramInfo = this.grantType === LwaServiceClient.LWA_CREDENTIALS_GRANT_TYPE ? "&refresh_token=" + accessTokenRequest.refreshToken : "&scope=" + accessTokenRequest.scope;
                            bodyParams = "grant_type=" + this.grantType + "&client_secret=" + accessTokenRequest.clientSecret + "&client_id=" + accessTokenRequest.clientId + paramInfo;
                            errorDefinitions = new Map();
                            errorDefinitions.set(200, 'Token request sent.');
                            errorDefinitions.set(400, 'Bad Request');
                            errorDefinitions.set(401, 'Authentication Failed');
                            errorDefinitions.set(500, 'Internal Server Error');
                            return [4 /*yield*/, this.invoke('POST', authEndpoint, '/auth/O2/token', pathParams, queryParams, headerParams, bodyParams, errorDefinitions, true)];
                        case 1:
                            apiResponse = _a.sent();
                            return [2 /*return*/, apiResponse.body];
                    }
                });
            });
        };
        LwaServiceClient.EXPIRY_OFFSET_MILLIS = 60000;
        LwaServiceClient.REFRESH_ACCESS_TOKEN = 'refresh_access_token';
        LwaServiceClient.CLIENT_CREDENTIALS_GRANT_TYPE = 'client_credentials';
        LwaServiceClient.LWA_CREDENTIALS_GRANT_TYPE = 'refresh_token';
        LwaServiceClient.AUTH_ENDPOINT = 'https://api.amazon.com';
        return LwaServiceClient;
    }(BaseServiceClient));
    services.LwaServiceClient = LwaServiceClient;
})(services = exports.services || (exports.services = {}));
/**
 * function creating an AskSdk user agent.
 * @param packageVersion
 * @param customUserAgent
 */
function createUserAgent(packageVersion, customUserAgent) {
    var customUserAgentString = customUserAgent ? (' ' + customUserAgent) : '';
    return "ask-node-model/" + packageVersion + " Node/" + process.version + customUserAgentString;
}
exports.createUserAgent = createUserAgent;
(function (services) {
    var datastore;
    (function (datastore) {
        /**
         *
        */
        var DatastoreServiceClient = /** @class */ (function (_super) {
            __extends(DatastoreServiceClient, _super);
            function DatastoreServiceClient(apiConfiguration, authenticationConfiguration, customUserAgent) {
                if (customUserAgent === void 0) { customUserAgent = null; }
                var _this = _super.call(this, apiConfiguration) || this;
                _this.lwaServiceClient = new services.LwaServiceClient({
                    apiConfiguration: apiConfiguration,
                    authenticationConfiguration: authenticationConfiguration,
                });
                _this.userAgent = createUserAgent("" + (__webpack_require__(288)/* .version */ .rE), customUserAgent);
                return _this;
            }
            /**
             * Send DataStore commands to Alexa device.
             * @param {services.datastore.v1.CommandsRequest} commandsRequest
             */
            DatastoreServiceClient.prototype.callCommandsV1 = function (commandsRequest) {
                return __awaiter(this, void 0, void 0, function () {
                    var __operationId__, queryParams, headerParams, pathParams, accessToken, authorizationValue, resourcePath, errorDefinitions;
                    return __generator(this, function (_a) {
                        switch (_a.label) {
                            case 0:
                                __operationId__ = 'callCommandsV1';
                                // verify required parameter 'commandsRequest' is not null or undefined
                                if (commandsRequest == null) {
                                    throw new Error("Required parameter commandsRequest was null or undefined when calling " + __operationId__ + ".");
                                }
                                queryParams = [];
                                headerParams = [];
                                headerParams.push({ key: 'User-Agent', value: this.userAgent });
                                if (!headerParams.find(function (param) { return param.key.toLowerCase() === 'content-type'; })) {
                                    headerParams.push({ key: 'Content-type', value: 'application/json' });
                                }
                                pathParams = new Map();
                                return [4 /*yield*/, this.lwaServiceClient.getAccessTokenForScope("alexa::datastore")];
                            case 1:
                                accessToken = _a.sent();
                                authorizationValue = "Bearer " + accessToken;
                                headerParams.push({ key: "Authorization", value: authorizationValue });
                                resourcePath = "/v1/datastore/commands";
                                errorDefinitions = new Map();
                                errorDefinitions.set(200, "Multiple CommandsDispatchResults in response.");
                                errorDefinitions.set(400, "Request validation fails.");
                                errorDefinitions.set(401, "Not Authorized.");
                                errorDefinitions.set(403, "The skill is not allowed to execute commands.");
                                errorDefinitions.set(429, "The client has made more calls than the allowed limit.");
                                errorDefinitions.set(0, "Unexpected error.");
                                return [2 /*return*/, this.invoke("POST", this.apiConfiguration.apiEndpoint, resourcePath, pathParams, queryParams, headerParams, commandsRequest, errorDefinitions)];
                        }
                    });
                });
            };
            /**
             * Send DataStore commands to Alexa device.
             * @param {services.datastore.v1.CommandsRequest} commandsRequest
             */
            DatastoreServiceClient.prototype.commandsV1 = function (commandsRequest) {
                return __awaiter(this, void 0, void 0, function () {
                    var apiResponse;
                    return __generator(this, function (_a) {
                        switch (_a.label) {
                            case 0: return [4 /*yield*/, this.callCommandsV1(commandsRequest)];
                            case 1:
                                apiResponse = _a.sent();
                                return [2 /*return*/, apiResponse.body];
                        }
                    });
                });
            };
            /**
             * Cancel pending DataStore commands.
             * @param {string} queuedResultId A unique identifier to query result for queued delivery for offline devices (DEVICE_UNAVAILABLE).
             */
            DatastoreServiceClient.prototype.callCancelCommandsV1 = function (queuedResultId) {
                return __awaiter(this, void 0, void 0, function () {
                    var __operationId__, queryParams, headerParams, pathParams, accessToken, authorizationValue, resourcePath, errorDefinitions;
                    return __generator(this, function (_a) {
                        switch (_a.label) {
                            case 0:
                                __operationId__ = 'callCancelCommandsV1';
                                // verify required parameter 'queuedResultId' is not null or undefined
                                if (queuedResultId == null) {
                                    throw new Error("Required parameter queuedResultId was null or undefined when calling " + __operationId__ + ".");
                                }
                                queryParams = [];
                                headerParams = [];
                                headerParams.push({ key: 'User-Agent', value: this.userAgent });
                                pathParams = new Map();
                                pathParams.set('queuedResultId', queuedResultId);
                                return [4 /*yield*/, this.lwaServiceClient.getAccessTokenForScope("alexa::datastore")];
                            case 1:
                                accessToken = _a.sent();
                                authorizationValue = "Bearer " + accessToken;
                                headerParams.push({ key: "Authorization", value: authorizationValue });
                                resourcePath = "/v1/datastore/queue/{queuedResultId}/cancel";
                                errorDefinitions = new Map();
                                errorDefinitions.set(204, "Success. No content.");
                                errorDefinitions.set(400, "Request validation fails.");
                                errorDefinitions.set(401, "Not Authorized.");
                                errorDefinitions.set(403, "The skill is not allowed to call this API commands.");
                                errorDefinitions.set(404, "Unable to find the pending request.");
                                errorDefinitions.set(429, "The client has made more calls than the allowed limit.");
                                errorDefinitions.set(0, "Unexpected error.");
                                return [2 /*return*/, this.invoke("POST", this.apiConfiguration.apiEndpoint, resourcePath, pathParams, queryParams, headerParams, null, errorDefinitions)];
                        }
                    });
                });
            };
            /**
             * Cancel pending DataStore commands.
             * @param {string} queuedResultId A unique identifier to query result for queued delivery for offline devices (DEVICE_UNAVAILABLE).
             */
            DatastoreServiceClient.prototype.cancelCommandsV1 = function (queuedResultId) {
                return __awaiter(this, void 0, void 0, function () {
                    return __generator(this, function (_a) {
                        switch (_a.label) {
                            case 0: return [4 /*yield*/, this.callCancelCommandsV1(queuedResultId)];
                            case 1:
                                _a.sent();
                                return [2 /*return*/];
                        }
                    });
                });
            };
            /**
             * Query statuses of deliveries to offline devices returned by commands API.
             * @param {string} queuedResultId A unique identifier to query result for queued delivery for offline devices (DEVICE_UNAVAILABLE).
             * @param {number} maxResults Maximum number of CommandsDispatchResult items to return.
             * @param {string} nextToken The value of nextToken in the response to fetch next page. If not specified, the request fetches result for the first page.
             */
            DatastoreServiceClient.prototype.callQueuedResultV1 = function (queuedResultId, maxResults, nextToken) {
                return __awaiter(this, void 0, void 0, function () {
                    var __operationId__, queryParams, maxResultsValues, nextTokenValues, headerParams, pathParams, accessToken, authorizationValue, resourcePath, errorDefinitions;
                    return __generator(this, function (_a) {
                        switch (_a.label) {
                            case 0:
                                __operationId__ = 'callQueuedResultV1';
                                // verify required parameter 'queuedResultId' is not null or undefined
                                if (queuedResultId == null) {
                                    throw new Error("Required parameter queuedResultId was null or undefined when calling " + __operationId__ + ".");
                                }
                                queryParams = [];
                                if (maxResults != null) {
                                    maxResultsValues = Array.isArray(maxResults) ? maxResults : [maxResults];
                                    maxResultsValues.forEach(function (val) { return queryParams.push({ key: 'maxResults', value: val.toString() }); });
                                }
                                if (nextToken != null) {
                                    nextTokenValues = Array.isArray(nextToken) ? nextToken : [nextToken];
                                    nextTokenValues.forEach(function (val) { return queryParams.push({ key: 'nextToken', value: val }); });
                                }
                                headerParams = [];
                                headerParams.push({ key: 'User-Agent', value: this.userAgent });
                                pathParams = new Map();
                                pathParams.set('queuedResultId', queuedResultId);
                                return [4 /*yield*/, this.lwaServiceClient.getAccessTokenForScope("alexa::datastore")];
                            case 1:
                                accessToken = _a.sent();
                                authorizationValue = "Bearer " + accessToken;
                                headerParams.push({ key: "Authorization", value: authorizationValue });
                                resourcePath = "/v1/datastore/queue/{queuedResultId}";
                                errorDefinitions = new Map();
                                errorDefinitions.set(200, "Unordered array of CommandsDispatchResult and pagination details.");
                                errorDefinitions.set(400, "Request validation fails.");
                                errorDefinitions.set(401, "Not Authorized.");
                                errorDefinitions.set(403, "The skill is not allowed to call this API commands.");
                                errorDefinitions.set(429, "The client has made more calls than the allowed limit.");
                                errorDefinitions.set(0, "Unexpected error.");
                                return [2 /*return*/, this.invoke("GET", this.apiConfiguration.apiEndpoint, resourcePath, pathParams, queryParams, headerParams, null, errorDefinitions)];
                        }
                    });
                });
            };
            /**
             * Query statuses of deliveries to offline devices returned by commands API.
             * @param {string} queuedResultId A unique identifier to query result for queued delivery for offline devices (DEVICE_UNAVAILABLE).
             * @param {number} maxResults Maximum number of CommandsDispatchResult items to return.
             * @param {string} nextToken The value of nextToken in the response to fetch next page. If not specified, the request fetches result for the first page.
             */
            DatastoreServiceClient.prototype.queuedResultV1 = function (queuedResultId, maxResults, nextToken) {
                return __awaiter(this, void 0, void 0, function () {
                    var apiResponse;
                    return __generator(this, function (_a) {
                        switch (_a.label) {
                            case 0: return [4 /*yield*/, this.callQueuedResultV1(queuedResultId, maxResults, nextToken)];
                            case 1:
                                apiResponse = _a.sent();
                                return [2 /*return*/, apiResponse.body];
                        }
                    });
                });
            };
            return DatastoreServiceClient;
        }(services.BaseServiceClient));
        datastore.DatastoreServiceClient = DatastoreServiceClient;
    })(datastore = services.datastore || (services.datastore = {}));
})(services = exports.services || (exports.services = {}));
(function (services) {
    var deviceAddress;
    (function (deviceAddress) {
        /**
         *
        */
        var DeviceAddressServiceClient = /** @class */ (function (_super) {
            __extends(DeviceAddressServiceClient, _super);
            function DeviceAddressServiceClient(apiConfiguration, customUserAgent) {
                if (customUserAgent === void 0) { customUserAgent = null; }
                var _this = _super.call(this, apiConfiguration) || this;
                _this.userAgent = createUserAgent("" + (__webpack_require__(288)/* .version */ .rE), customUserAgent);
                return _this;
            }
            /**
             * Gets the country and postal code of a device
             * @param {string} deviceId The device Id for which to get the country and postal code
             */
            DeviceAddressServiceClient.prototype.callGetCountryAndPostalCode = function (deviceId) {
                return __awaiter(this, void 0, void 0, function () {
                    var __operationId__, queryParams, headerParams, pathParams, authorizationValue, resourcePath, errorDefinitions;
                    return __generator(this, function (_a) {
                        __operationId__ = 'callGetCountryAndPostalCode';
                        // verify required parameter 'deviceId' is not null or undefined
                        if (deviceId == null) {
                            throw new Error("Required parameter deviceId was null or undefined when calling " + __operationId__ + ".");
                        }
                        queryParams = [];
                        headerParams = [];
                        headerParams.push({ key: 'User-Agent', value: this.userAgent });
                        pathParams = new Map();
                        pathParams.set('deviceId', deviceId);
                        authorizationValue = "Bearer " + this.apiConfiguration.authorizationValue;
                        headerParams.push({ key: "Authorization", value: authorizationValue });
                        resourcePath = "/v1/devices/{deviceId}/settings/address/countryAndPostalCode";
                        errorDefinitions = new Map();
                        errorDefinitions.set(200, "Successfully get the country and postal code of the deviceId");
                        errorDefinitions.set(204, "No content could be queried out");
                        errorDefinitions.set(403, "The authentication token is invalid or doesn&#39;t have access to the resource");
                        errorDefinitions.set(405, "The method is not supported");
                        errorDefinitions.set(429, "The request is throttled");
                        errorDefinitions.set(0, "Unexpected error");
                        return [2 /*return*/, this.invoke("GET", this.apiConfiguration.apiEndpoint, resourcePath, pathParams, queryParams, headerParams, null, errorDefinitions)];
                    });
                });
            };
            /**
             * Gets the country and postal code of a device
             * @param {string} deviceId The device Id for which to get the country and postal code
             */
            DeviceAddressServiceClient.prototype.getCountryAndPostalCode = function (deviceId) {
                return __awaiter(this, void 0, void 0, function () {
                    var apiResponse;
                    return __generator(this, function (_a) {
                        switch (_a.label) {
                            case 0: return [4 /*yield*/, this.callGetCountryAndPostalCode(deviceId)];
                            case 1:
                                apiResponse = _a.sent();
                                return [2 /*return*/, apiResponse.body];
                        }
                    });
                });
            };
            /**
             * Gets the address of a device
             * @param {string} deviceId The device Id for which to get the address
             */
            DeviceAddressServiceClient.prototype.callGetFullAddress = function (deviceId) {
                return __awaiter(this, void 0, void 0, function () {
                    var __operationId__, queryParams, headerParams, pathParams, authorizationValue, resourcePath, errorDefinitions;
                    return __generator(this, function (_a) {
                        __operationId__ = 'callGetFullAddress';
                        // verify required parameter 'deviceId' is not null or undefined
                        if (deviceId == null) {
                            throw new Error("Required parameter deviceId was null or undefined when calling " + __operationId__ + ".");
                        }
                        queryParams = [];
                        headerParams = [];
                        headerParams.push({ key: 'User-Agent', value: this.userAgent });
                        pathParams = new Map();
                        pathParams.set('deviceId', deviceId);
                        authorizationValue = "Bearer " + this.apiConfiguration.authorizationValue;
                        headerParams.push({ key: "Authorization", value: authorizationValue });
                        resourcePath = "/v1/devices/{deviceId}/settings/address";
                        errorDefinitions = new Map();
                        errorDefinitions.set(200, "Successfully get the address of the device");
                        errorDefinitions.set(204, "No content could be queried out");
                        errorDefinitions.set(403, "The authentication token is invalid or doesn&#39;t have access to the resource");
                        errorDefinitions.set(405, "The method is not supported");
                        errorDefinitions.set(429, "The request is throttled");
                        errorDefinitions.set(0, "Unexpected error");
                        return [2 /*return*/, this.invoke("GET", this.apiConfiguration.apiEndpoint, resourcePath, pathParams, queryParams, headerParams, null, errorDefinitions)];
                    });
                });
            };
            /**
             * Gets the address of a device
             * @param {string} deviceId The device Id for which to get the address
             */
            DeviceAddressServiceClient.prototype.getFullAddress = function (deviceId) {
                return __awaiter(this, void 0, void 0, function () {
                    var apiResponse;
                    return __generator(this, function (_a) {
                        switch (_a.label) {
                            case 0: return [4 /*yield*/, this.callGetFullAddress(deviceId)];
                            case 1:
                                apiResponse = _a.sent();
                                return [2 /*return*/, apiResponse.body];
                        }
                    });
                });
            };
            return DeviceAddressServiceClient;
        }(services.BaseServiceClient));
        deviceAddress.DeviceAddressServiceClient = DeviceAddressServiceClient;
    })(deviceAddress = services.deviceAddress || (services.deviceAddress = {}));
})(services = exports.services || (exports.services = {}));
(function (services) {
    var directive;
    (function (directive) {
        /**
         *
        */
        var DirectiveServiceClient = /** @class */ (function (_super) {
            __extends(DirectiveServiceClient, _super);
            function DirectiveServiceClient(apiConfiguration, customUserAgent) {
                if (customUserAgent === void 0) { customUserAgent = null; }
                var _this = _super.call(this, apiConfiguration) || this;
                _this.userAgent = createUserAgent("" + (__webpack_require__(288)/* .version */ .rE), customUserAgent);
                return _this;
            }
            /**
             * Send directives to Alexa.
             * @param {services.directive.SendDirectiveRequest} sendDirectiveRequest Represents the request object to send in the payload.
             */
            DirectiveServiceClient.prototype.callEnqueue = function (sendDirectiveRequest) {
                return __awaiter(this, void 0, void 0, function () {
                    var __operationId__, queryParams, headerParams, pathParams, authorizationValue, resourcePath, errorDefinitions;
                    return __generator(this, function (_a) {
                        __operationId__ = 'callEnqueue';
                        // verify required parameter 'sendDirectiveRequest' is not null or undefined
                        if (sendDirectiveRequest == null) {
                            throw new Error("Required parameter sendDirectiveRequest was null or undefined when calling " + __operationId__ + ".");
                        }
                        queryParams = [];
                        headerParams = [];
                        headerParams.push({ key: 'User-Agent', value: this.userAgent });
                        if (!headerParams.find(function (param) { return param.key.toLowerCase() === 'content-type'; })) {
                            headerParams.push({ key: 'Content-type', value: 'application/json' });
                        }
                        pathParams = new Map();
                        authorizationValue = "Bearer " + this.apiConfiguration.authorizationValue;
                        headerParams.push({ key: "Authorization", value: authorizationValue });
                        resourcePath = "/v1/directives";
                        errorDefinitions = new Map();
                        errorDefinitions.set(204, "Directive sent successfully.");
                        errorDefinitions.set(400, "Directive not valid.");
                        errorDefinitions.set(401, "Not Authorized.");
                        errorDefinitions.set(403, "The skill is not allowed to send directives at the moment.");
                        errorDefinitions.set(0, "Unexpected error.");
                        return [2 /*return*/, this.invoke("POST", this.apiConfiguration.apiEndpoint, resourcePath, pathParams, queryParams, headerParams, sendDirectiveRequest, errorDefinitions)];
                    });
                });
            };
            /**
             * Send directives to Alexa.
             * @param {services.directive.SendDirectiveRequest} sendDirectiveRequest Represents the request object to send in the payload.
             */
            DirectiveServiceClient.prototype.enqueue = function (sendDirectiveRequest) {
                return __awaiter(this, void 0, void 0, function () {
                    return __generator(this, function (_a) {
                        switch (_a.label) {
                            case 0: return [4 /*yield*/, this.callEnqueue(sendDirectiveRequest)];
                            case 1:
                                _a.sent();
                                return [2 /*return*/];
                        }
                    });
                });
            };
            return DirectiveServiceClient;
        }(services.BaseServiceClient));
        directive.DirectiveServiceClient = DirectiveServiceClient;
    })(directive = services.directive || (services.directive = {}));
})(services = exports.services || (exports.services = {}));
(function (services) {
    var endpointEnumeration;
    (function (endpointEnumeration) {
        /**
         *
        */
        var EndpointEnumerationServiceClient = /** @class */ (function (_super) {
            __extends(EndpointEnumerationServiceClient, _super);
            function EndpointEnumerationServiceClient(apiConfiguration, customUserAgent) {
                if (customUserAgent === void 0) { customUserAgent = null; }
                var _this = _super.call(this, apiConfiguration) || this;
                _this.userAgent = createUserAgent("" + (__webpack_require__(288)/* .version */ .rE), customUserAgent);
                return _this;
            }
            /**
             * This API is invoked by the skill to retrieve endpoints connected to the Echo device.
             */
            EndpointEnumerationServiceClient.prototype.callGetEndpoints = function () {
                return __awaiter(this, void 0, void 0, function () {
                    var __operationId__, queryParams, headerParams, pathParams, authorizationValue, resourcePath, errorDefinitions;
                    return __generator(this, function (_a) {
                        __operationId__ = 'callGetEndpoints';
                        queryParams = [];
                        headerParams = [];
                        headerParams.push({ key: 'User-Agent', value: this.userAgent });
                        pathParams = new Map();
                        authorizationValue = "Bearer " + this.apiConfiguration.authorizationValue;
                        headerParams.push({ key: "Authorization", value: authorizationValue });
                        resourcePath = "/v1/endpoints";
                        errorDefinitions = new Map();
                        errorDefinitions.set(200, "Successfully retrieved the list of connected endpoints.");
                        errorDefinitions.set(400, "Bad request. Returned when a required parameter is not present or badly formatted.");
                        errorDefinitions.set(401, "Unauthenticated. Returned when the request is not authenticated.");
                        errorDefinitions.set(403, "Forbidden. Returned when the request is authenticated but does not have sufficient permission.");
                        errorDefinitions.set(500, "Server Error. Returned when the server encountered an error processing the request.");
                        errorDefinitions.set(503, "Service Unavailable. Returned when the server is not ready to handle the request.");
                        errorDefinitions.set(0, "Unexpected error");
                        return [2 /*return*/, this.invoke("GET", this.apiConfiguration.apiEndpoint, resourcePath, pathParams, queryParams, headerParams, null, errorDefinitions)];
                    });
                });
            };
            /**
             * This API is invoked by the skill to retrieve endpoints connected to the Echo device.
             */
            EndpointEnumerationServiceClient.prototype.getEndpoints = function () {
                return __awaiter(this, void 0, void 0, function () {
                    var apiResponse;
                    return __generator(this, function (_a) {
                        switch (_a.label) {
                            case 0: return [4 /*yield*/, this.callGetEndpoints()];
                            case 1:
                                apiResponse = _a.sent();
                                return [2 /*return*/, apiResponse.body];
                        }
                    });
                });
            };
            return EndpointEnumerationServiceClient;
        }(services.BaseServiceClient));
        endpointEnumeration.EndpointEnumerationServiceClient = EndpointEnumerationServiceClient;
    })(endpointEnumeration = services.endpointEnumeration || (services.endpointEnumeration = {}));
})(services = exports.services || (exports.services = {}));
(function (services) {
    var listManagement;
    (function (listManagement) {
        /**
         *
        */
        var ListManagementServiceClient = /** @class */ (function (_super) {
            __extends(ListManagementServiceClient, _super);
            function ListManagementServiceClient(apiConfiguration, customUserAgent) {
                if (customUserAgent === void 0) { customUserAgent = null; }
                var _this = _super.call(this, apiConfiguration) || this;
                _this.userAgent = createUserAgent("" + (__webpack_require__(288)/* .version */ .rE), customUserAgent);
                return _this;
            }
            /**
             * Retrieves the metadata for all customer lists, including the customer’s default lists.
             */
            ListManagementServiceClient.prototype.callGetListsMetadata = function () {
                return __awaiter(this, void 0, void 0, function () {
                    var __operationId__, queryParams, headerParams, pathParams, authorizationValue, resourcePath, errorDefinitions;
                    return __generator(this, function (_a) {
                        __operationId__ = 'callGetListsMetadata';
                        queryParams = [];
                        headerParams = [];
                        headerParams.push({ key: 'User-Agent', value: this.userAgent });
                        pathParams = new Map();
                        authorizationValue = "Bearer " + this.apiConfiguration.authorizationValue;
                        headerParams.push({ key: "Authorization", value: authorizationValue });
                        resourcePath = "/v2/householdlists";
                        errorDefinitions = new Map();
                        errorDefinitions.set(200, "Success");
                        errorDefinitions.set(403, "Forbidden");
                        errorDefinitions.set(500, "Internal Server Error");
                        return [2 /*return*/, this.invoke("GET", "https://api.amazonalexa.com/", resourcePath, pathParams, queryParams, headerParams, null, errorDefinitions)];
                    });
                });
            };
            /**
             * Retrieves the metadata for all customer lists, including the customer’s default lists.
             */
            ListManagementServiceClient.prototype.getListsMetadata = function () {
                return __awaiter(this, void 0, void 0, function () {
                    var apiResponse;
                    return __generator(this, function (_a) {
                        switch (_a.label) {
                            case 0: return [4 /*yield*/, this.callGetListsMetadata()];
                            case 1:
                                apiResponse = _a.sent();
                                return [2 /*return*/, apiResponse.body];
                        }
                    });
                });
            };
            /**
             * This API deletes a customer custom list.
             * @param {string} listId Value of the customer’s listId retrieved from a getListsMetadata call
             */
            ListManagementServiceClient.prototype.callDeleteList = function (listId) {
                return __awaiter(this, void 0, void 0, function () {
                    var __operationId__, queryParams, headerParams, pathParams, authorizationValue, resourcePath, errorDefinitions;
                    return __generator(this, function (_a) {
                        __operationId__ = 'callDeleteList';
                        // verify required parameter 'listId' is not null or undefined
                        if (listId == null) {
                            throw new Error("Required parameter listId was null or undefined when calling " + __operationId__ + ".");
                        }
                        queryParams = [];
                        headerParams = [];
                        headerParams.push({ key: 'User-Agent', value: this.userAgent });
                        pathParams = new Map();
                        pathParams.set('listId', listId);
                        authorizationValue = "Bearer " + this.apiConfiguration.authorizationValue;
                        headerParams.push({ key: "Authorization", value: authorizationValue });
                        resourcePath = "/v2/householdlists/{listId}";
                        errorDefinitions = new Map();
                        errorDefinitions.set(200, "Success");
                        errorDefinitions.set(403, "Forbidden");
                        errorDefinitions.set(404, "Not Found");
                        errorDefinitions.set(500, "Internal Server Error");
                        errorDefinitions.set(0, "Internal Server Error");
                        return [2 /*return*/, this.invoke("DELETE", "https://api.amazonalexa.com/", resourcePath, pathParams, queryParams, headerParams, null, errorDefinitions)];
                    });
                });
            };
            /**
             * This API deletes a customer custom list.
             * @param {string} listId Value of the customer’s listId retrieved from a getListsMetadata call
             */
            ListManagementServiceClient.prototype.deleteList = function (listId) {
                return __awaiter(this, void 0, void 0, function () {
                    return __generator(this, function (_a) {
                        switch (_a.label) {
                            case 0: return [4 /*yield*/, this.callDeleteList(listId)];
                            case 1:
                                _a.sent();
                                return [2 /*return*/];
                        }
                    });
                });
            };
            /**
             * This API deletes an item in the specified list.
             * @param {string} listId The customer’s listId is retrieved from a getListsMetadata call.
             * @param {string} itemId The customer’s itemId is retrieved from a GetList call.
             */
            ListManagementServiceClient.prototype.callDeleteListItem = function (listId, itemId) {
                return __awaiter(this, void 0, void 0, function () {
                    var __operationId__, queryParams, headerParams, pathParams, authorizationValue, resourcePath, errorDefinitions;
                    return __generator(this, function (_a) {
                        __operationId__ = 'callDeleteListItem';
                        // verify required parameter 'listId' is not null or undefined
                        if (listId == null) {
                            throw new Error("Required parameter listId was null or undefined when calling " + __operationId__ + ".");
                        }
                        // verify required parameter 'itemId' is not null or undefined
                        if (itemId == null) {
                            throw new Error("Required parameter itemId was null or undefined when calling " + __operationId__ + ".");
                        }
                        queryParams = [];
                        headerParams = [];
                        headerParams.push({ key: 'User-Agent', value: this.userAgent });
                        pathParams = new Map();
                        pathParams.set('listId', listId);
                        pathParams.set('itemId', itemId);
                        authorizationValue = "Bearer " + this.apiConfiguration.authorizationValue;
                        headerParams.push({ key: "Authorization", value: authorizationValue });
                        resourcePath = "/v2/householdlists/{listId}/items/{itemId}";
                        errorDefinitions = new Map();
                        errorDefinitions.set(200, "Success");
                        errorDefinitions.set(403, "Forbidden");
                        errorDefinitions.set(404, "Not Found");
                        errorDefinitions.set(500, "Internal Server Error");
                        errorDefinitions.set(0, "Internal Server Error");
                        return [2 /*return*/, this.invoke("DELETE", "https://api.amazonalexa.com/", resourcePath, pathParams, queryParams, headerParams, null, errorDefinitions)];
                    });
                });
            };
            /**
             * This API deletes an item in the specified list.
             * @param {string} listId The customer’s listId is retrieved from a getListsMetadata call.
             * @param {string} itemId The customer’s itemId is retrieved from a GetList call.
             */
            ListManagementServiceClient.prototype.deleteListItem = function (listId, itemId) {
                return __awaiter(this, void 0, void 0, function () {
                    return __generator(this, function (_a) {
                        switch (_a.label) {
                            case 0: return [4 /*yield*/, this.callDeleteListItem(listId, itemId)];
                            case 1:
                                _a.sent();
                                return [2 /*return*/];
                        }
                    });
                });
            };
            /**
             * This API can be used to retrieve single item with in any list by listId and itemId. This API can read list items from an archived list. Attempting to read list items from a deleted list return an ObjectNotFound 404 error.
             * @param {string} listId Retrieved from a call to getListsMetadata
             * @param {string} itemId itemId within a list is retrieved from a getList call
             */
            ListManagementServiceClient.prototype.callGetListItem = function (listId, itemId) {
                return __awaiter(this, void 0, void 0, function () {
                    var __operationId__, queryParams, headerParams, pathParams, authorizationValue, resourcePath, errorDefinitions;
                    return __generator(this, function (_a) {
                        __operationId__ = 'callGetListItem';
                        // verify required parameter 'listId' is not null or undefined
                        if (listId == null) {
                            throw new Error("Required parameter listId was null or undefined when calling " + __operationId__ + ".");
                        }
                        // verify required parameter 'itemId' is not null or undefined
                        if (itemId == null) {
                            throw new Error("Required parameter itemId was null or undefined when calling " + __operationId__ + ".");
                        }
                        queryParams = [];
                        headerParams = [];
                        headerParams.push({ key: 'User-Agent', value: this.userAgent });
                        pathParams = new Map();
                        pathParams.set('listId', listId);
                        pathParams.set('itemId', itemId);
                        authorizationValue = "Bearer " + this.apiConfiguration.authorizationValue;
                        headerParams.push({ key: "Authorization", value: authorizationValue });
                        resourcePath = "/v2/householdlists/{listId}/items/{itemId}";
                        errorDefinitions = new Map();
                        errorDefinitions.set(200, "Success");
                        errorDefinitions.set(403, "Forbidden");
                        errorDefinitions.set(404, "Not Found");
                        errorDefinitions.set(500, "Internal Server Error");
                        errorDefinitions.set(0, "Internal Server Error");
                        return [2 /*return*/, this.invoke("GET", "https://api.amazonalexa.com/", resourcePath, pathParams, queryParams, headerParams, null, errorDefinitions)];
                    });
                });
            };
            /**
             * This API can be used to retrieve single item with in any list by listId and itemId. This API can read list items from an archived list. Attempting to read list items from a deleted list return an ObjectNotFound 404 error.
             * @param {string} listId Retrieved from a call to getListsMetadata
             * @param {string} itemId itemId within a list is retrieved from a getList call
             */
            ListManagementServiceClient.prototype.getListItem = function (listId, itemId) {
                return __awaiter(this, void 0, void 0, function () {
                    var apiResponse;
                    return __generator(this, function (_a) {
                        switch (_a.label) {
                            case 0: return [4 /*yield*/, this.callGetListItem(listId, itemId)];
                            case 1:
                                apiResponse = _a.sent();
                                return [2 /*return*/, apiResponse.body];
                        }
                    });
                });
            };
            /**
             * API used to update an item value or item status.
             * @param {string} listId Customer’s listId
             * @param {string} itemId itemId to be updated in the list
             * @param {services.listManagement.UpdateListItemRequest} updateListItemRequest
             */
            ListManagementServiceClient.prototype.callUpdateListItem = function (listId, itemId, updateListItemRequest) {
                return __awaiter(this, void 0, void 0, function () {
                    var __operationId__, queryParams, headerParams, pathParams, authorizationValue, resourcePath, errorDefinitions;
                    return __generator(this, function (_a) {
                        __operationId__ = 'callUpdateListItem';
                        // verify required parameter 'listId' is not null or undefined
                        if (listId == null) {
                            throw new Error("Required parameter listId was null or undefined when calling " + __operationId__ + ".");
                        }
                        // verify required parameter 'itemId' is not null or undefined
                        if (itemId == null) {
                            throw new Error("Required parameter itemId was null or undefined when calling " + __operationId__ + ".");
                        }
                        // verify required parameter 'updateListItemRequest' is not null or undefined
                        if (updateListItemRequest == null) {
                            throw new Error("Required parameter updateListItemRequest was null or undefined when calling " + __operationId__ + ".");
                        }
                        queryParams = [];
                        headerParams = [];
                        headerParams.push({ key: 'User-Agent', value: this.userAgent });
                        if (!headerParams.find(function (param) { return param.key.toLowerCase() === 'content-type'; })) {
                            headerParams.push({ key: 'Content-type', value: 'application/json' });
                        }
                        pathParams = new Map();
                        pathParams.set('listId', listId);
                        pathParams.set('itemId', itemId);
                        authorizationValue = "Bearer " + this.apiConfiguration.authorizationValue;
                        headerParams.push({ key: "Authorization", value: authorizationValue });
                        resourcePath = "/v2/householdlists/{listId}/items/{itemId}";
                        errorDefinitions = new Map();
                        errorDefinitions.set(200, "Success");
                        errorDefinitions.set(403, "Forbidden");
                        errorDefinitions.set(404, "Not Found");
                        errorDefinitions.set(409, "Conflict");
                        errorDefinitions.set(500, "Internal Server Error");
                        errorDefinitions.set(0, "Internal Server Error");
                        return [2 /*return*/, this.invoke("PUT", "https://api.amazonalexa.com/", resourcePath, pathParams, queryParams, headerParams, updateListItemRequest, errorDefinitions)];
                    });
                });
            };
            /**
             * API used to update an item value or item status.
             * @param {string} listId Customer’s listId
             * @param {string} itemId itemId to be updated in the list
             * @param {services.listManagement.UpdateListItemRequest} updateListItemRequest
             */
            ListManagementServiceClient.prototype.updateListItem = function (listId, itemId, updateListItemRequest) {
                return __awaiter(this, void 0, void 0, function () {
                    var apiResponse;
                    return __generator(this, function (_a) {
                        switch (_a.label) {
                            case 0: return [4 /*yield*/, this.callUpdateListItem(listId, itemId, updateListItemRequest)];
                            case 1:
                                apiResponse = _a.sent();
                                return [2 /*return*/, apiResponse.body];
                        }
                    });
                });
            };
            /**
             * This API creates an item in an active list or in a default list.
             * @param {string} listId The customer’s listId retrieved from a getListsMetadata call.
             * @param {services.listManagement.CreateListItemRequest} createListItemRequest
             */
            ListManagementServiceClient.prototype.callCreateListItem = function (listId, createListItemRequest) {
                return __awaiter(this, void 0, void 0, function () {
                    var __operationId__, queryParams, headerParams, pathParams, authorizationValue, resourcePath, errorDefinitions;
                    return __generator(this, function (_a) {
                        __operationId__ = 'callCreateListItem';
                        // verify required parameter 'listId' is not null or undefined
                        if (listId == null) {
                            throw new Error("Required parameter listId was null or undefined when calling " + __operationId__ + ".");
                        }
                        // verify required parameter 'createListItemRequest' is not null or undefined
                        if (createListItemRequest == null) {
                            throw new Error("Required parameter createListItemRequest was null or undefined when calling " + __operationId__ + ".");
                        }
                        queryParams = [];
                        headerParams = [];
                        headerParams.push({ key: 'User-Agent', value: this.userAgent });
                        if (!headerParams.find(function (param) { return param.key.toLowerCase() === 'content-type'; })) {
                            headerParams.push({ key: 'Content-type', value: 'application/json' });
                        }
                        pathParams = new Map();
                        pathParams.set('listId', listId);
                        authorizationValue = "Bearer " + this.apiConfiguration.authorizationValue;
                        headerParams.push({ key: "Authorization", value: authorizationValue });
                        resourcePath = "/v2/householdlists/{listId}/items";
                        errorDefinitions = new Map();
                        errorDefinitions.set(201, "Success");
                        errorDefinitions.set(400, "Bad Request");
                        errorDefinitions.set(403, "Forbidden");
                        errorDefinitions.set(404, "Not found");
                        errorDefinitions.set(500, "Internal Server Error");
                        errorDefinitions.set(0, "Internal Server Error");
                        return [2 /*return*/, this.invoke("POST", "https://api.amazonalexa.com/", resourcePath, pathParams, queryParams, headerParams, createListItemRequest, errorDefinitions)];
                    });
                });
            };
            /**
             * This API creates an item in an active list or in a default list.
             * @param {string} listId The customer’s listId retrieved from a getListsMetadata call.
             * @param {services.listManagement.CreateListItemRequest} createListItemRequest
             */
            ListManagementServiceClient.prototype.createListItem = function (listId, createListItemRequest) {
                return __awaiter(this, void 0, void 0, function () {
                    var apiResponse;
                    return __generator(this, function (_a) {
                        switch (_a.label) {
                            case 0: return [4 /*yield*/, this.callCreateListItem(listId, createListItemRequest)];
                            case 1:
                                apiResponse = _a.sent();
                                return [2 /*return*/, apiResponse.body];
                        }
                    });
                });
            };
            /**
             * This API updates a custom list. Only the list name or state can be updated. An Alexa customer can turn an archived list into an active one.
             * @param {string} listId Value of the customer’s listId retrieved from a getListsMetadata call.
             * @param {services.listManagement.UpdateListRequest} updateListRequest
             */
            ListManagementServiceClient.prototype.callUpdateList = function (listId, updateListRequest) {
                return __awaiter(this, void 0, void 0, function () {
                    var __operationId__, queryParams, headerParams, pathParams, authorizationValue, resourcePath, errorDefinitions;
                    return __generator(this, function (_a) {
                        __operationId__ = 'callUpdateList';
                        // verify required parameter 'listId' is not null or undefined
                        if (listId == null) {
                            throw new Error("Required parameter listId was null or undefined when calling " + __operationId__ + ".");
                        }
                        // verify required parameter 'updateListRequest' is not null or undefined
                        if (updateListRequest == null) {
                            throw new Error("Required parameter updateListRequest was null or undefined when calling " + __operationId__ + ".");
                        }
                        queryParams = [];
                        headerParams = [];
                        headerParams.push({ key: 'User-Agent', value: this.userAgent });
                        if (!headerParams.find(function (param) { return param.key.toLowerCase() === 'content-type'; })) {
                            headerParams.push({ key: 'Content-type', value: 'application/json' });
                        }
                        pathParams = new Map();
                        pathParams.set('listId', listId);
                        authorizationValue = "Bearer " + this.apiConfiguration.authorizationValue;
                        headerParams.push({ key: "Authorization", value: authorizationValue });
                        resourcePath = "/v2/householdlists/{listId}";
                        errorDefinitions = new Map();
                        errorDefinitions.set(200, "Success");
                        errorDefinitions.set(400, "Bad Request");
                        errorDefinitions.set(403, "Forbidden");
                        errorDefinitions.set(404, "List not found");
                        errorDefinitions.set(409, "Conflict");
                        errorDefinitions.set(500, "Internal Server Error");
                        errorDefinitions.set(0, "Internal Server Error");
                        return [2 /*return*/, this.invoke("PUT", "https://api.amazonalexa.com/", resourcePath, pathParams, queryParams, headerParams, updateListRequest, errorDefinitions)];
                    });
                });
            };
            /**
             * This API updates a custom list. Only the list name or state can be updated. An Alexa customer can turn an archived list into an active one.
             * @param {string} listId Value of the customer’s listId retrieved from a getListsMetadata call.
             * @param {services.listManagement.UpdateListRequest} updateListRequest
             */
            ListManagementServiceClient.prototype.updateList = function (listId, updateListRequest) {
                return __awaiter(this, void 0, void 0, function () {
                    var apiResponse;
                    return __generator(this, function (_a) {
                        switch (_a.label) {
                            case 0: return [4 /*yield*/, this.callUpdateList(listId, updateListRequest)];
                            case 1:
                                apiResponse = _a.sent();
                                return [2 /*return*/, apiResponse.body];
                        }
                    });
                });
            };
            /**
             * Retrieves the list metadata including the items in the list with requested status.
             * @param {string} listId Retrieved from a call to GetListsMetadata to specify the listId in the request path.
             * @param {string} status Specify the status of the list.
             */
            ListManagementServiceClient.prototype.callGetList = function (listId, status) {
                return __awaiter(this, void 0, void 0, function () {
                    var __operationId__, queryParams, headerParams, pathParams, authorizationValue, resourcePath, errorDefinitions;
                    return __generator(this, function (_a) {
                        __operationId__ = 'callGetList';
                        // verify required parameter 'listId' is not null or undefined
                        if (listId == null) {
                            throw new Error("Required parameter listId was null or undefined when calling " + __operationId__ + ".");
                        }
                        // verify required parameter 'status' is not null or undefined
                        if (status == null) {
                            throw new Error("Required parameter status was null or undefined when calling " + __operationId__ + ".");
                        }
                        queryParams = [];
                        headerParams = [];
                        headerParams.push({ key: 'User-Agent', value: this.userAgent });
                        pathParams = new Map();
                        pathParams.set('listId', listId);
                        pathParams.set('status', status);
                        authorizationValue = "Bearer " + this.apiConfiguration.authorizationValue;
                        headerParams.push({ key: "Authorization", value: authorizationValue });
                        resourcePath = "/v2/householdlists/{listId}/{status}";
                        errorDefinitions = new Map();
                        errorDefinitions.set(200, "Success");
                        errorDefinitions.set(400, "Bad Request");
                        errorDefinitions.set(403, "Forbidden");
                        errorDefinitions.set(404, "Not Found");
                        errorDefinitions.set(500, "Internal Server Error");
                        errorDefinitions.set(0, "Internal Server Error");
                        return [2 /*return*/, this.invoke("GET", "https://api.amazonalexa.com/", resourcePath, pathParams, queryParams, headerParams, null, errorDefinitions)];
                    });
                });
            };
            /**
             * Retrieves the list metadata including the items in the list with requested status.
             * @param {string} listId Retrieved from a call to GetListsMetadata to specify the listId in the request path.
             * @param {string} status Specify the status of the list.
             */
            ListManagementServiceClient.prototype.getList = function (listId, status) {
                return __awaiter(this, void 0, void 0, function () {
                    var apiResponse;
                    return __generator(this, function (_a) {
                        switch (_a.label) {
                            case 0: return [4 /*yield*/, this.callGetList(listId, status)];
                            case 1:
                                apiResponse = _a.sent();
                                return [2 /*return*/, apiResponse.body];
                        }
                    });
                });
            };
            /**
             * This API creates a custom list. The new list name must be different than any existing list name.
             * @param {services.listManagement.CreateListRequest} createListRequest
             */
            ListManagementServiceClient.prototype.callCreateList = function (createListRequest) {
                return __awaiter(this, void 0, void 0, function () {
                    var __operationId__, queryParams, headerParams, pathParams, authorizationValue, resourcePath, errorDefinitions;
                    return __generator(this, function (_a) {
                        __operationId__ = 'callCreateList';
                        // verify required parameter 'createListRequest' is not null or undefined
                        if (createListRequest == null) {
                            throw new Error("Required parameter createListRequest was null or undefined when calling " + __operationId__ + ".");
                        }
                        queryParams = [];
                        headerParams = [];
                        headerParams.push({ key: 'User-Agent', value: this.userAgent });
                        if (!headerParams.find(function (param) { return param.key.toLowerCase() === 'content-type'; })) {
                            headerParams.push({ key: 'Content-type', value: 'application/json' });
                        }
                        pathParams = new Map();
                        authorizationValue = "Bearer " + this.apiConfiguration.authorizationValue;
                        headerParams.push({ key: "Authorization", value: authorizationValue });
                        resourcePath = "/v2/householdlists";
                        errorDefinitions = new Map();
                        errorDefinitions.set(201, "Success");
                        errorDefinitions.set(400, "Bad Request");
                        errorDefinitions.set(403, "Forbidden");
                        errorDefinitions.set(409, "Conflict");
                        errorDefinitions.set(500, "Internal Server Error");
                        errorDefinitions.set(0, "Internal Server Error");
                        return [2 /*return*/, this.invoke("POST", "https://api.amazonalexa.com/", resourcePath, pathParams, queryParams, headerParams, createListRequest, errorDefinitions)];
                    });
                });
            };
            /**
             * This API creates a custom list. The new list name must be different than any existing list name.
             * @param {services.listManagement.CreateListRequest} createListRequest
             */
            ListManagementServiceClient.prototype.createList = function (createListRequest) {
                return __awaiter(this, void 0, void 0, function () {
                    var apiResponse;
                    return __generator(this, function (_a) {
                        switch (_a.label) {
                            case 0: return [4 /*yield*/, this.callCreateList(createListRequest)];
                            case 1:
                                apiResponse = _a.sent();
                                return [2 /*return*/, apiResponse.body];
                        }
                    });
                });
            };
            return ListManagementServiceClient;
        }(services.BaseServiceClient));
        listManagement.ListManagementServiceClient = ListManagementServiceClient;
    })(listManagement = services.listManagement || (services.listManagement = {}));
})(services = exports.services || (exports.services = {}));
(function (services) {
    var monetization;
    (function (monetization) {
        /**
         *
        */
        var MonetizationServiceClient = /** @class */ (function (_super) {
            __extends(MonetizationServiceClient, _super);
            function MonetizationServiceClient(apiConfiguration, customUserAgent) {
                if (customUserAgent === void 0) { customUserAgent = null; }
                var _this = _super.call(this, apiConfiguration) || this;
                _this.userAgent = createUserAgent("" + (__webpack_require__(288)/* .version */ .rE), customUserAgent);
                return _this;
            }
            /**
             * Gets In-Skill Products based on user's context for the Skill.
             * @param {string} acceptLanguage User&#39;s locale/language in context
             * @param {string} purchasable Filter products based on whether they are purchasable by the user or not. * &#39;PURCHASABLE&#39; - Products that are purchasable by the user. * &#39;NOT_PURCHASABLE&#39; - Products that are not purchasable by the user.
             * @param {string} entitled Filter products based on whether they are entitled to the user or not. * &#39;ENTITLED&#39; - Products that the user is entitled to. * &#39;NOT_ENTITLED&#39; - Products that the user is not entitled to.
             * @param {string} productType Product type. * &#39;SUBSCRIPTION&#39; - Once purchased, customers will own the content for the subscription period. * &#39;ENTITLEMENT&#39; - Once purchased, customers will own the content forever. * &#39;CONSUMABLE&#39; - Once purchased, customers will be entitled to the content until it is consumed. It can also be re-purchased.
             * @param {string} nextToken When response to this API call is truncated (that is, isTruncated response element value is true), the response also includes the nextToken element, the value of which can be used in the next request as the continuation-token to list the next set of objects. The continuation token is an opaque value that In-Skill Products API understands. Token has expiry of 24 hours.
             * @param {number} maxResults sets the maximum number of results returned in the response body. If you want to retrieve fewer than upper limit of 100 results, you can add this parameter to your request. maxResults should not exceed the upper limit. The response might contain fewer results than maxResults, but it will never contain more. If there are additional results that satisfy the search criteria, but these results were not returned because maxResults was exceeded, the response contains isTruncated &#x3D; true.
             */
            MonetizationServiceClient.prototype.callGetInSkillProducts = function (acceptLanguage, purchasable, entitled, productType, nextToken, maxResults) {
                return __awaiter(this, void 0, void 0, function () {
                    var __operationId__, queryParams, purchasableValues, entitledValues, productTypeValues, nextTokenValues, maxResultsValues, headerParams, pathParams, authorizationValue, resourcePath, errorDefinitions;
                    return __generator(this, function (_a) {
                        __operationId__ = 'callGetInSkillProducts';
                        // verify required parameter 'acceptLanguage' is not null or undefined
                        if (acceptLanguage == null) {
                            throw new Error("Required parameter acceptLanguage was null or undefined when calling " + __operationId__ + ".");
                        }
                        queryParams = [];
                        if (purchasable != null) {
                            purchasableValues = Array.isArray(purchasable) ? purchasable : [purchasable];
                            purchasableValues.forEach(function (val) { return queryParams.push({ key: 'purchasable', value: val }); });
                        }
                        if (entitled != null) {
                            entitledValues = Array.isArray(entitled) ? entitled : [entitled];
                            entitledValues.forEach(function (val) { return queryParams.push({ key: 'entitled', value: val }); });
                        }
                        if (productType != null) {
                            productTypeValues = Array.isArray(productType) ? productType : [productType];
                            productTypeValues.forEach(function (val) { return queryParams.push({ key: 'productType', value: val }); });
                        }
                        if (nextToken != null) {
                            nextTokenValues = Array.isArray(nextToken) ? nextToken : [nextToken];
                            nextTokenValues.forEach(function (val) { return queryParams.push({ key: 'nextToken', value: val }); });
                        }
                        if (maxResults != null) {
                            maxResultsValues = Array.isArray(maxResults) ? maxResults : [maxResults];
                            maxResultsValues.forEach(function (val) { return queryParams.push({ key: 'maxResults', value: val.toString() }); });
                        }
                        headerParams = [];
                        headerParams.push({ key: 'User-Agent', value: this.userAgent });
                        headerParams.push({ key: 'Accept-Language', value: acceptLanguage });
                        pathParams = new Map();
                        authorizationValue = "Bearer " + this.apiConfiguration.authorizationValue;
                        headerParams.push({ key: "Authorization", value: authorizationValue });
                        resourcePath = "/v1/users/~current/skills/~current/inSkillProducts";
                        errorDefinitions = new Map();
                        errorDefinitions.set(200, "Returns a list of In-Skill products on success.");
                        errorDefinitions.set(400, "Invalid request");
                        errorDefinitions.set(401, "The authentication token is invalid or doesn&#39;t have access to make this request");
                        errorDefinitions.set(500, "Internal Server Error");
                        return [2 /*return*/, this.invoke("GET", this.apiConfiguration.apiEndpoint, resourcePath, pathParams, queryParams, headerParams, null, errorDefinitions)];
                    });
                });
            };
            /**
             * Gets In-Skill Products based on user's context for the Skill.
             * @param {string} acceptLanguage User&#39;s locale/language in context
             * @param {string} purchasable Filter products based on whether they are purchasable by the user or not. * &#39;PURCHASABLE&#39; - Products that are purchasable by the user. * &#39;NOT_PURCHASABLE&#39; - Products that are not purchasable by the user.
             * @param {string} entitled Filter products based on whether they are entitled to the user or not. * &#39;ENTITLED&#39; - Products that the user is entitled to. * &#39;NOT_ENTITLED&#39; - Products that the user is not entitled to.
             * @param {string} productType Product type. * &#39;SUBSCRIPTION&#39; - Once purchased, customers will own the content for the subscription period. * &#39;ENTITLEMENT&#39; - Once purchased, customers will own the content forever. * &#39;CONSUMABLE&#39; - Once purchased, customers will be entitled to the content until it is consumed. It can also be re-purchased.
             * @param {string} nextToken When response to this API call is truncated (that is, isTruncated response element value is true), the response also includes the nextToken element, the value of which can be used in the next request as the continuation-token to list the next set of objects. The continuation token is an opaque value that In-Skill Products API understands. Token has expiry of 24 hours.
             * @param {number} maxResults sets the maximum number of results returned in the response body. If you want to retrieve fewer than upper limit of 100 results, you can add this parameter to your request. maxResults should not exceed the upper limit. The response might contain fewer results than maxResults, but it will never contain more. If there are additional results that satisfy the search criteria, but these results were not returned because maxResults was exceeded, the response contains isTruncated &#x3D; true.
             */
            MonetizationServiceClient.prototype.getInSkillProducts = function (acceptLanguage, purchasable, entitled, productType, nextToken, maxResults) {
                return __awaiter(this, void 0, void 0, function () {
                    var apiResponse;
                    return __generator(this, function (_a) {
                        switch (_a.label) {
                            case 0: return [4 /*yield*/, this.callGetInSkillProducts(acceptLanguage, purchasable, entitled, productType, nextToken, maxResults)];
                            case 1:
                                apiResponse = _a.sent();
                                return [2 /*return*/, apiResponse.body];
                        }
                    });
                });
            };
            /**
             * Get In-Skill Product information based on user context for the Skill.
             * @param {string} acceptLanguage User&#39;s locale/language in context
             * @param {string} productId Product Id.
             */
            MonetizationServiceClient.prototype.callGetInSkillProduct = function (acceptLanguage, productId) {
                return __awaiter(this, void 0, void 0, function () {
                    var __operationId__, queryParams, headerParams, pathParams, authorizationValue, resourcePath, errorDefinitions;
                    return __generator(this, function (_a) {
                        __operationId__ = 'callGetInSkillProduct';
                        // verify required parameter 'acceptLanguage' is not null or undefined
                        if (acceptLanguage == null) {
                            throw new Error("Required parameter acceptLanguage was null or undefined when calling " + __operationId__ + ".");
                        }
                        // verify required parameter 'productId' is not null or undefined
                        if (productId == null) {
                            throw new Error("Required parameter productId was null or undefined when calling " + __operationId__ + ".");
                        }
                        queryParams = [];
                        headerParams = [];
                        headerParams.push({ key: 'User-Agent', value: this.userAgent });
                        headerParams.push({ key: 'Accept-Language', value: acceptLanguage });
                        pathParams = new Map();
                        pathParams.set('productId', productId);
                        authorizationValue = "Bearer " + this.apiConfiguration.authorizationValue;
                        headerParams.push({ key: "Authorization", value: authorizationValue });
                        resourcePath = "/v1/users/~current/skills/~current/inSkillProducts/{productId}";
                        errorDefinitions = new Map();
                        errorDefinitions.set(200, "Returns an In-Skill Product on success.");
                        errorDefinitions.set(400, "Invalid request.");
                        errorDefinitions.set(401, "The authentication token is invalid or doesn&#39;t have access to make this request");
                        errorDefinitions.set(404, "Requested resource not found.");
                        errorDefinitions.set(500, "Internal Server Error.");
                        return [2 /*return*/, this.invoke("GET", this.apiConfiguration.apiEndpoint, resourcePath, pathParams, queryParams, headerParams, null, errorDefinitions)];
                    });
                });
            };
            /**
             * Get In-Skill Product information based on user context for the Skill.
             * @param {string} acceptLanguage User&#39;s locale/language in context
             * @param {string} productId Product Id.
             */
            MonetizationServiceClient.prototype.getInSkillProduct = function (acceptLanguage, productId) {
                return __awaiter(this, void 0, void 0, function () {
                    var apiResponse;
                    return __generator(this, function (_a) {
                        switch (_a.label) {
                            case 0: return [4 /*yield*/, this.callGetInSkillProduct(acceptLanguage, productId)];
                            case 1:
                                apiResponse = _a.sent();
                                return [2 /*return*/, apiResponse.body];
                        }
                    });
                });
            };
            /**
             * Returns transactions of all in skill products purchases of the customer
             * @param {string} acceptLanguage User&#39;s locale/language in context
             * @param {string} productId Product Id.
             * @param {string} status Transaction status for in skill product purchases. * &#39;PENDING_APPROVAL_BY_PARENT&#39; - The transaction is pending approval from parent. * &#39;APPROVED_BY_PARENT&#39; - The transaction was approved by parent and fulfilled successfully.. * &#39;DENIED_BY_PARENT&#39; - The transaction was declined by parent and hence not fulfilled. * &#39;EXPIRED_NO_ACTION_BY_PARENT&#39; - The transaction was expired due to no response from parent and hence not fulfilled. * &#39;ERROR&#39; - The transaction was not fullfiled as there was an error while processing the transaction.
             * @param {string} fromLastModifiedTime Filter transactions based on last modified time stamp, FROM duration in format (UTC ISO 8601) i.e. yyyy-MM-dd&#39;T&#39;HH:mm:ss.SSS&#39;Z&#39;
             * @param {string} toLastModifiedTime Filter transactions based on last modified time stamp, TO duration in format (UTC ISO 8601) i.e. yyyy-MM-dd&#39;T&#39;HH:mm:ss.SSS&#39;Z&#39;
             * @param {string} nextToken When response to this API call is truncated, the response also includes the nextToken in metadata, the value of which can be used in the next request as the continuation-token to list the next set of objects. The continuation token is an opaque value that In-Skill Products API understands. Token has expiry of 24 hours.
             * @param {number} maxResults sets the maximum number of results returned in the response body. If you want to retrieve fewer than upper limit of 100 results, you can add this parameter to your request. maxResults should not exceed the upper limit. The response might contain fewer results than maxResults, but it will never contain more. If there are additional results that satisfy the search criteria, but these results were not returned because maxResults was exceeded, the response contains nextToken which can be used to fetch next set of result.
             */
            MonetizationServiceClient.prototype.callGetInSkillProductsTransactions = function (acceptLanguage, productId, status, fromLastModifiedTime, toLastModifiedTime, nextToken, maxResults) {
                return __awaiter(this, void 0, void 0, function () {
                    var __operationId__, queryParams, productIdValues, statusValues, fromLastModifiedTimeValues, toLastModifiedTimeValues, nextTokenValues, maxResultsValues, headerParams, pathParams, authorizationValue, resourcePath, errorDefinitions;
                    return __generator(this, function (_a) {
                        __operationId__ = 'callGetInSkillProductsTransactions';
                        // verify required parameter 'acceptLanguage' is not null or undefined
                        if (acceptLanguage == null) {
                            throw new Error("Required parameter acceptLanguage was null or undefined when calling " + __operationId__ + ".");
                        }
                        queryParams = [];
                        if (productId != null) {
                            productIdValues = Array.isArray(productId) ? productId : [productId];
                            productIdValues.forEach(function (val) { return queryParams.push({ key: 'productId', value: val }); });
                        }
                        if (status != null) {
                            statusValues = Array.isArray(status) ? status : [status];
                            statusValues.forEach(function (val) { return queryParams.push({ key: 'status', value: val }); });
                        }
                        if (fromLastModifiedTime != null) {
                            fromLastModifiedTimeValues = Array.isArray(fromLastModifiedTime) ? fromLastModifiedTime : [fromLastModifiedTime];
                            fromLastModifiedTimeValues.forEach(function (val) { return queryParams.push({ key: 'fromLastModifiedTime', value: val.toString() }); });
                        }
                        if (toLastModifiedTime != null) {
                            toLastModifiedTimeValues = Array.isArray(toLastModifiedTime) ? toLastModifiedTime : [toLastModifiedTime];
                            toLastModifiedTimeValues.forEach(function (val) { return queryParams.push({ key: 'toLastModifiedTime', value: val.toString() }); });
                        }
                        if (nextToken != null) {
                            nextTokenValues = Array.isArray(nextToken) ? nextToken : [nextToken];
                            nextTokenValues.forEach(function (val) { return queryParams.push({ key: 'nextToken', value: val }); });
                        }
                        if (maxResults != null) {
                            maxResultsValues = Array.isArray(maxResults) ? maxResults : [maxResults];
                            maxResultsValues.forEach(function (val) { return queryParams.push({ key: 'maxResults', value: val.toString() }); });
                        }
                        headerParams = [];
                        headerParams.push({ key: 'User-Agent', value: this.userAgent });
                        headerParams.push({ key: 'Accept-Language', value: acceptLanguage });
                        pathParams = new Map();
                        authorizationValue = "Bearer " + this.apiConfiguration.authorizationValue;
                        headerParams.push({ key: "Authorization", value: authorizationValue });
                        resourcePath = "/v1/users/~current/skills/~current/inSkillProductsTransactions";
                        errorDefinitions = new Map();
                        errorDefinitions.set(200, "Returns a list of transactions of all in skill products purchases in last 30 days on success.");
                        errorDefinitions.set(400, "Invalid request");
                        errorDefinitions.set(401, "The authentication token is invalid or doesn&#39;t have access to make this request");
                        errorDefinitions.set(403, "Forbidden request");
                        errorDefinitions.set(404, "Product id doesn&#39;t exist / invalid / not found.");
                        errorDefinitions.set(412, "Non-Child Directed Skill is not supported.");
                        errorDefinitions.set(429, "The request is throttled.");
                        errorDefinitions.set(500, "Internal Server Error");
                        return [2 /*return*/, this.invoke("GET", this.apiConfiguration.apiEndpoint, resourcePath, pathParams, queryParams, headerParams, null, errorDefinitions)];
                    });
                });
            };
            /**
             * Returns transactions of all in skill products purchases of the customer
             * @param {string} acceptLanguage User&#39;s locale/language in context
             * @param {string} productId Product Id.
             * @param {string} status Transaction status for in skill product purchases. * &#39;PENDING_APPROVAL_BY_PARENT&#39; - The transaction is pending approval from parent. * &#39;APPROVED_BY_PARENT&#39; - The transaction was approved by parent and fulfilled successfully.. * &#39;DENIED_BY_PARENT&#39; - The transaction was declined by parent and hence not fulfilled. * &#39;EXPIRED_NO_ACTION_BY_PARENT&#39; - The transaction was expired due to no response from parent and hence not fulfilled. * &#39;ERROR&#39; - The transaction was not fullfiled as there was an error while processing the transaction.
             * @param {string} fromLastModifiedTime Filter transactions based on last modified time stamp, FROM duration in format (UTC ISO 8601) i.e. yyyy-MM-dd&#39;T&#39;HH:mm:ss.SSS&#39;Z&#39;
             * @param {string} toLastModifiedTime Filter transactions based on last modified time stamp, TO duration in format (UTC ISO 8601) i.e. yyyy-MM-dd&#39;T&#39;HH:mm:ss.SSS&#39;Z&#39;
             * @param {string} nextToken When response to this API call is truncated, the response also includes the nextToken in metadata, the value of which can be used in the next request as the continuation-token to list the next set of objects. The continuation token is an opaque value that In-Skill Products API understands. Token has expiry of 24 hours.
             * @param {number} maxResults sets the maximum number of results returned in the response body. If you want to retrieve fewer than upper limit of 100 results, you can add this parameter to your request. maxResults should not exceed the upper limit. The response might contain fewer results than maxResults, but it will never contain more. If there are additional results that satisfy the search criteria, but these results were not returned because maxResults was exceeded, the response contains nextToken which can be used to fetch next set of result.
             */
            MonetizationServiceClient.prototype.getInSkillProductsTransactions = function (acceptLanguage, productId, status, fromLastModifiedTime, toLastModifiedTime, nextToken, maxResults) {
                return __awaiter(this, void 0, void 0, function () {
                    var apiResponse;
                    return __generator(this, function (_a) {
                        switch (_a.label) {
                            case 0: return [4 /*yield*/, this.callGetInSkillProductsTransactions(acceptLanguage, productId, status, fromLastModifiedTime, toLastModifiedTime, nextToken, maxResults)];
                            case 1:
                                apiResponse = _a.sent();
                                return [2 /*return*/, apiResponse.body];
                        }
                    });
                });
            };
            /**
             * Returns whether or not voice purchasing is enabled for the skill
             */
            MonetizationServiceClient.prototype.callGetVoicePurchaseSetting = function () {
                return __awaiter(this, void 0, void 0, function () {
                    var __operationId__, queryParams, headerParams, pathParams, authorizationValue, resourcePath, errorDefinitions;
                    return __generator(this, function (_a) {
                        __operationId__ = 'callGetVoicePurchaseSetting';
                        queryParams = [];
                        headerParams = [];
                        headerParams.push({ key: 'User-Agent', value: this.userAgent });
                        pathParams = new Map();
                        authorizationValue = "Bearer " + this.apiConfiguration.authorizationValue;
                        headerParams.push({ key: "Authorization", value: authorizationValue });
                        resourcePath = "/v1/users/~current/skills/~current/settings/voicePurchasing.enabled";
                        errorDefinitions = new Map();
                        errorDefinitions.set(200, "Returns a boolean value for voice purchase setting on success.");
                        errorDefinitions.set(400, "Invalid request.");
                        errorDefinitions.set(401, "The authentication token is invalid or doesn&#39;t have access to make this request");
                        errorDefinitions.set(500, "Internal Server Error.");
                        return [2 /*return*/, this.invoke("GET", this.apiConfiguration.apiEndpoint, resourcePath, pathParams, queryParams, headerParams, null, errorDefinitions)];
                    });
                });
            };
            /**
             * Returns whether or not voice purchasing is enabled for the skill
             */
            MonetizationServiceClient.prototype.getVoicePurchaseSetting = function () {
                return __awaiter(this, void 0, void 0, function () {
                    var apiResponse;
                    return __generator(this, function (_a) {
                        switch (_a.label) {
                            case 0: return [4 /*yield*/, this.callGetVoicePurchaseSetting()];
                            case 1:
                                apiResponse = _a.sent();
                                return [2 /*return*/, apiResponse.body];
                        }
                    });
                });
            };
            return MonetizationServiceClient;
        }(services.BaseServiceClient));
        monetization.MonetizationServiceClient = MonetizationServiceClient;
    })(monetization = services.monetization || (services.monetization = {}));
})(services = exports.services || (exports.services = {}));
(function (services) {
    var proactiveEvents;
    (function (proactiveEvents) {
        /**
         *
        */
        var ProactiveEventsServiceClient = /** @class */ (function (_super) {
            __extends(ProactiveEventsServiceClient, _super);
            function ProactiveEventsServiceClient(apiConfiguration, authenticationConfiguration, customUserAgent) {
                if (customUserAgent === void 0) { customUserAgent = null; }
                var _this = _super.call(this, apiConfiguration) || this;
                _this.lwaServiceClient = new services.LwaServiceClient({
                    apiConfiguration: apiConfiguration,
                    authenticationConfiguration: authenticationConfiguration,
                });
                _this.userAgent = createUserAgent("" + (__webpack_require__(288)/* .version */ .rE), customUserAgent);
                return _this;
            }
            /**
             * Create a new proactive event in live stage.
             * @param {services.proactiveEvents.CreateProactiveEventRequest} createProactiveEventRequest Request to create a new proactive event.
             */
            ProactiveEventsServiceClient.prototype.callCreateProactiveEvent = function (createProactiveEventRequest, stage) {
                return __awaiter(this, void 0, void 0, function () {
                    var __operationId__, queryParams, headerParams, pathParams, accessToken, authorizationValue, resourcePath, errorDefinitions;
                    return __generator(this, function (_a) {
                        switch (_a.label) {
                            case 0:
                                __operationId__ = 'callCreateProactiveEvent';
                                // verify required parameter 'createProactiveEventRequest' is not null or undefined
                                if (createProactiveEventRequest == null) {
                                    throw new Error("Required parameter createProactiveEventRequest was null or undefined when calling " + __operationId__ + ".");
                                }
                                queryParams = [];
                                headerParams = [];
                                headerParams.push({ key: 'User-Agent', value: this.userAgent });
                                if (!headerParams.find(function (param) { return param.key.toLowerCase() === 'content-type'; })) {
                                    headerParams.push({ key: 'Content-type', value: 'application/json' });
                                }
                                pathParams = new Map();
                                return [4 /*yield*/, this.lwaServiceClient.getAccessTokenForScope("alexa::proactive_events")];
                            case 1:
                                accessToken = _a.sent();
                                authorizationValue = "Bearer " + accessToken;
                                headerParams.push({ key: "Authorization", value: authorizationValue });
                                resourcePath = "/v1/proactiveEvents";
                                if (stage === 'DEVELOPMENT') {
                                    resourcePath += '/stages/development';
                                }
                                errorDefinitions = new Map();
                                errorDefinitions.set(202, "Request accepted");
                                errorDefinitions.set(400, "A required parameter is not present or is incorrectly formatted, or the requested creation of a resource has already been completed by a previous request. ");
                                errorDefinitions.set(403, "The authentication token is invalid or doesn&#39;t have authentication to access the resource");
                                errorDefinitions.set(409, "A skill attempts to create duplicate events using the same referenceId for the same customer.");
                                errorDefinitions.set(429, "The client has made more calls than the allowed limit.");
                                errorDefinitions.set(500, "The ProactiveEvents service encounters an internal error for a valid request.");
                                errorDefinitions.set(0, "Unexpected error");
                                return [2 /*return*/, this.invoke("POST", this.apiConfiguration.apiEndpoint, resourcePath, pathParams, queryParams, headerParams, createProactiveEventRequest, errorDefinitions)];
                        }
                    });
                });
            };
            /**
             * Create a new proactive event in live stage.
             * @param {services.proactiveEvents.CreateProactiveEventRequest} createProactiveEventRequest Request to create a new proactive event.
             */
            ProactiveEventsServiceClient.prototype.createProactiveEvent = function (createProactiveEventRequest, stage) {
                return __awaiter(this, void 0, void 0, function () {
                    return __generator(this, function (_a) {
                        switch (_a.label) {
                            case 0: return [4 /*yield*/, this.callCreateProactiveEvent(createProactiveEventRequest, stage)];
                            case 1:
                                _a.sent();
                                return [2 /*return*/];
                        }
                    });
                });
            };
            return ProactiveEventsServiceClient;
        }(services.BaseServiceClient));
        proactiveEvents.ProactiveEventsServiceClient = ProactiveEventsServiceClient;
    })(proactiveEvents = services.proactiveEvents || (services.proactiveEvents = {}));
})(services = exports.services || (exports.services = {}));
(function (services) {
    var reminderManagement;
    (function (reminderManagement) {
        /**
         *
        */
        var ReminderManagementServiceClient = /** @class */ (function (_super) {
            __extends(ReminderManagementServiceClient, _super);
            function ReminderManagementServiceClient(apiConfiguration, customUserAgent) {
                if (customUserAgent === void 0) { customUserAgent = null; }
                var _this = _super.call(this, apiConfiguration) || this;
                _this.userAgent = createUserAgent("" + (__webpack_require__(288)/* .version */ .rE), customUserAgent);
                return _this;
            }
            /**
             * This API is invoked by the skill to delete a single reminder.
             * @param {string} alertToken
             */
            ReminderManagementServiceClient.prototype.callDeleteReminder = function (alertToken) {
                return __awaiter(this, void 0, void 0, function () {
                    var __operationId__, queryParams, headerParams, pathParams, authorizationValue, resourcePath, errorDefinitions;
                    return __generator(this, function (_a) {
                        __operationId__ = 'callDeleteReminder';
                        // verify required parameter 'alertToken' is not null or undefined
                        if (alertToken == null) {
                            throw new Error("Required parameter alertToken was null or undefined when calling " + __operationId__ + ".");
                        }
                        queryParams = [];
                        headerParams = [];
                        headerParams.push({ key: 'User-Agent', value: this.userAgent });
                        pathParams = new Map();
                        pathParams.set('alertToken', alertToken);
                        authorizationValue = "Bearer " + this.apiConfiguration.authorizationValue;
                        headerParams.push({ key: "Authorization", value: authorizationValue });
                        resourcePath = "/v1/alerts/reminders/{alertToken}";
                        errorDefinitions = new Map();
                        errorDefinitions.set(200, "Success");
                        errorDefinitions.set(401, "UserAuthenticationException. Request is not authorized/authenticated e.g. If customer does not have permission to create a reminder.");
                        errorDefinitions.set(429, "RateExceededException e.g. When the skill is throttled for exceeding the max rate");
                        errorDefinitions.set(500, "Internal Server Error");
                        return [2 /*return*/, this.invoke("DELETE", this.apiConfiguration.apiEndpoint, resourcePath, pathParams, queryParams, headerParams, null, errorDefinitions)];
                    });
                });
            };
            /**
             * This API is invoked by the skill to delete a single reminder.
             * @param {string} alertToken
             */
            ReminderManagementServiceClient.prototype.deleteReminder = function (alertToken) {
                return __awaiter(this, void 0, void 0, function () {
                    return __generator(this, function (_a) {
                        switch (_a.label) {
                            case 0: return [4 /*yield*/, this.callDeleteReminder(alertToken)];
                            case 1:
                                _a.sent();
                                return [2 /*return*/];
                        }
                    });
                });
            };
            /**
             * This API is invoked by the skill to get a single reminder.
             * @param {string} alertToken
             */
            ReminderManagementServiceClient.prototype.callGetReminder = function (alertToken) {
                return __awaiter(this, void 0, void 0, function () {
                    var __operationId__, queryParams, headerParams, pathParams, authorizationValue, resourcePath, errorDefinitions;
                    return __generator(this, function (_a) {
                        __operationId__ = 'callGetReminder';
                        // verify required parameter 'alertToken' is not null or undefined
                        if (alertToken == null) {
                            throw new Error("Required parameter alertToken was null or undefined when calling " + __operationId__ + ".");
                        }
                        queryParams = [];
                        headerParams = [];
                        headerParams.push({ key: 'User-Agent', value: this.userAgent });
                        pathParams = new Map();
                        pathParams.set('alertToken', alertToken);
                        authorizationValue = "Bearer " + this.apiConfiguration.authorizationValue;
                        headerParams.push({ key: "Authorization", value: authorizationValue });
                        resourcePath = "/v1/alerts/reminders/{alertToken}";
                        errorDefinitions = new Map();
                        errorDefinitions.set(200, "Success");
                        errorDefinitions.set(401, "UserAuthenticationException. Request is not authorized/authenticated e.g. If customer does not have permission to create a reminder.");
                        errorDefinitions.set(429, "RateExceededException e.g. When the skill is throttled for exceeding the max rate");
                        errorDefinitions.set(500, "Internal Server Error");
                        return [2 /*return*/, this.invoke("GET", this.apiConfiguration.apiEndpoint, resourcePath, pathParams, queryParams, headerParams, null, errorDefinitions)];
                    });
                });
            };
            /**
             * This API is invoked by the skill to get a single reminder.
             * @param {string} alertToken
             */
            ReminderManagementServiceClient.prototype.getReminder = function (alertToken) {
                return __awaiter(this, void 0, void 0, function () {
                    var apiResponse;
                    return __generator(this, function (_a) {
                        switch (_a.label) {
                            case 0: return [4 /*yield*/, this.callGetReminder(alertToken)];
                            case 1:
                                apiResponse = _a.sent();
                                return [2 /*return*/, apiResponse.body];
                        }
                    });
                });
            };
            /**
             * This API is invoked by the skill to update a reminder.
             * @param {string} alertToken
             * @param {services.reminderManagement.ReminderRequest} reminderRequest
             */
            ReminderManagementServiceClient.prototype.callUpdateReminder = function (alertToken, reminderRequest) {
                return __awaiter(this, void 0, void 0, function () {
                    var __operationId__, queryParams, headerParams, pathParams, authorizationValue, resourcePath, errorDefinitions;
                    return __generator(this, function (_a) {
                        __operationId__ = 'callUpdateReminder';
                        // verify required parameter 'alertToken' is not null or undefined
                        if (alertToken == null) {
                            throw new Error("Required parameter alertToken was null or undefined when calling " + __operationId__ + ".");
                        }
                        // verify required parameter 'reminderRequest' is not null or undefined
                        if (reminderRequest == null) {
                            throw new Error("Required parameter reminderRequest was null or undefined when calling " + __operationId__ + ".");
                        }
                        queryParams = [];
                        headerParams = [];
                        headerParams.push({ key: 'User-Agent', value: this.userAgent });
                        if (!headerParams.find(function (param) { return param.key.toLowerCase() === 'content-type'; })) {
                            headerParams.push({ key: 'Content-type', value: 'application/json' });
                        }
                        pathParams = new Map();
                        pathParams.set('alertToken', alertToken);
                        authorizationValue = "Bearer " + this.apiConfiguration.authorizationValue;
                        headerParams.push({ key: "Authorization", value: authorizationValue });
                        resourcePath = "/v1/alerts/reminders/{alertToken}";
                        errorDefinitions = new Map();
                        errorDefinitions.set(200, "Success");
                        errorDefinitions.set(400, "Bad Request");
                        errorDefinitions.set(404, "NotFoundException e.g. Retured when reminder is not found");
                        errorDefinitions.set(409, "UserAuthenticationException. Request is not authorized/authenticated e.g. If customer does not have permission to create a reminder.");
                        errorDefinitions.set(429, "RateExceededException e.g. When the skill is throttled for exceeding the max rate");
                        errorDefinitions.set(500, "Internal Server Error");
                        return [2 /*return*/, this.invoke("PUT", this.apiConfiguration.apiEndpoint, resourcePath, pathParams, queryParams, headerParams, reminderRequest, errorDefinitions)];
                    });
                });
            };
            /**
             * This API is invoked by the skill to update a reminder.
             * @param {string} alertToken
             * @param {services.reminderManagement.ReminderRequest} reminderRequest
             */
            ReminderManagementServiceClient.prototype.updateReminder = function (alertToken, reminderRequest) {
                return __awaiter(this, void 0, void 0, function () {
                    var apiResponse;
                    return __generator(this, function (_a) {
                        switch (_a.label) {
                            case 0: return [4 /*yield*/, this.callUpdateReminder(alertToken, reminderRequest)];
                            case 1:
                                apiResponse = _a.sent();
                                return [2 /*return*/, apiResponse.body];
                        }
                    });
                });
            };
            /**
             * This API is invoked by the skill to get a all reminders created by the caller.
             */
            ReminderManagementServiceClient.prototype.callGetReminders = function () {
                return __awaiter(this, void 0, void 0, function () {
                    var __operationId__, queryParams, headerParams, pathParams, authorizationValue, resourcePath, errorDefinitions;
                    return __generator(this, function (_a) {
                        __operationId__ = 'callGetReminders';
                        queryParams = [];
                        headerParams = [];
                        headerParams.push({ key: 'User-Agent', value: this.userAgent });
                        pathParams = new Map();
                        authorizationValue = "Bearer " + this.apiConfiguration.authorizationValue;
                        headerParams.push({ key: "Authorization", value: authorizationValue });
                        resourcePath = "/v1/alerts/reminders";
                        errorDefinitions = new Map();
                        errorDefinitions.set(200, "Success");
                        errorDefinitions.set(401, "UserAuthenticationException. Request is not authorized/authenticated e.g. If customer does not have permission to create a reminder.");
                        errorDefinitions.set(429, "RateExceededException e.g. When the skill is throttled for exceeding the max rate");
                        errorDefinitions.set(500, "Internal Server Error");
                        return [2 /*return*/, this.invoke("GET", this.apiConfiguration.apiEndpoint, resourcePath, pathParams, queryParams, headerParams, null, errorDefinitions)];
                    });
                });
            };
            /**
             * This API is invoked by the skill to get a all reminders created by the caller.
             */
            ReminderManagementServiceClient.prototype.getReminders = function () {
                return __awaiter(this, void 0, void 0, function () {
                    var apiResponse;
                    return __generator(this, function (_a) {
                        switch (_a.label) {
                            case 0: return [4 /*yield*/, this.callGetReminders()];
                            case 1:
                                apiResponse = _a.sent();
                                return [2 /*return*/, apiResponse.body];
                        }
                    });
                });
            };
            /**
             * This API is invoked by the skill to create a new reminder.
             * @param {services.reminderManagement.ReminderRequest} reminderRequest
             */
            ReminderManagementServiceClient.prototype.callCreateReminder = function (reminderRequest) {
                return __awaiter(this, void 0, void 0, function () {
                    var __operationId__, queryParams, headerParams, pathParams, authorizationValue, resourcePath, errorDefinitions;
                    return __generator(this, function (_a) {
                        __operationId__ = 'callCreateReminder';
                        // verify required parameter 'reminderRequest' is not null or undefined
                        if (reminderRequest == null) {
                            throw new Error("Required parameter reminderRequest was null or undefined when calling " + __operationId__ + ".");
                        }
                        queryParams = [];
                        headerParams = [];
                        headerParams.push({ key: 'User-Agent', value: this.userAgent });
                        if (!headerParams.find(function (param) { return param.key.toLowerCase() === 'content-type'; })) {
                            headerParams.push({ key: 'Content-type', value: 'application/json' });
                        }
                        pathParams = new Map();
                        authorizationValue = "Bearer " + this.apiConfiguration.authorizationValue;
                        headerParams.push({ key: "Authorization", value: authorizationValue });
                        resourcePath = "/v1/alerts/reminders";
                        errorDefinitions = new Map();
                        errorDefinitions.set(200, "Success");
                        errorDefinitions.set(400, "Bad Request");
                        errorDefinitions.set(403, "Forbidden");
                        errorDefinitions.set(429, "RateExceededException e.g. When the skill is throttled for exceeding the max rate");
                        errorDefinitions.set(500, "Internal Server Error");
                        errorDefinitions.set(503, "Service Unavailable");
                        errorDefinitions.set(504, "Gateway Timeout");
                        return [2 /*return*/, this.invoke("POST", this.apiConfiguration.apiEndpoint, resourcePath, pathParams, queryParams, headerParams, reminderRequest, errorDefinitions)];
                    });
                });
            };
            /**
             * This API is invoked by the skill to create a new reminder.
             * @param {services.reminderManagement.ReminderRequest} reminderRequest
             */
            ReminderManagementServiceClient.prototype.createReminder = function (reminderRequest) {
                return __awaiter(this, void 0, void 0, function () {
                    var apiResponse;
                    return __generator(this, function (_a) {
                        switch (_a.label) {
                            case 0: return [4 /*yield*/, this.callCreateReminder(reminderRequest)];
                            case 1:
                                apiResponse = _a.sent();
                                return [2 /*return*/, apiResponse.body];
                        }
                    });
                });
            };
            return ReminderManagementServiceClient;
        }(services.BaseServiceClient));
        reminderManagement.ReminderManagementServiceClient = ReminderManagementServiceClient;
    })(reminderManagement = services.reminderManagement || (services.reminderManagement = {}));
})(services = exports.services || (exports.services = {}));
(function (services) {
    var skillMessaging;
    (function (skillMessaging) {
        /**
         *
        */
        var SkillMessagingServiceClient = /** @class */ (function (_super) {
            __extends(SkillMessagingServiceClient, _super);
            function SkillMessagingServiceClient(apiConfiguration, authenticationConfiguration, customUserAgent) {
                if (customUserAgent === void 0) { customUserAgent = null; }
                var _this = _super.call(this, apiConfiguration) || this;
                _this.lwaServiceClient = new services.LwaServiceClient({
                    apiConfiguration: apiConfiguration,
                    authenticationConfiguration: authenticationConfiguration,
                });
                _this.userAgent = createUserAgent("" + (__webpack_require__(288)/* .version */ .rE), customUserAgent);
                return _this;
            }
            /**
             * Send a message request to a skill for a specified user.
             * @param {string} userId The user Id for the specific user to send the message
             * @param {services.skillMessaging.SendSkillMessagingRequest} sendSkillMessagingRequest Message Request to be sent to the skill.
             */
            SkillMessagingServiceClient.prototype.callSendSkillMessage = function (userId, sendSkillMessagingRequest) {
                return __awaiter(this, void 0, void 0, function () {
                    var __operationId__, queryParams, headerParams, pathParams, accessToken, authorizationValue, resourcePath, errorDefinitions;
                    return __generator(this, function (_a) {
                        switch (_a.label) {
                            case 0:
                                __operationId__ = 'callSendSkillMessage';
                                // verify required parameter 'userId' is not null or undefined
                                if (userId == null) {
                                    throw new Error("Required parameter userId was null or undefined when calling " + __operationId__ + ".");
                                }
                                // verify required parameter 'sendSkillMessagingRequest' is not null or undefined
                                if (sendSkillMessagingRequest == null) {
                                    throw new Error("Required parameter sendSkillMessagingRequest was null or undefined when calling " + __operationId__ + ".");
                                }
                                queryParams = [];
                                headerParams = [];
                                headerParams.push({ key: 'User-Agent', value: this.userAgent });
                                if (!headerParams.find(function (param) { return param.key.toLowerCase() === 'content-type'; })) {
                                    headerParams.push({ key: 'Content-type', value: 'application/json' });
                                }
                                pathParams = new Map();
                                pathParams.set('userId', userId);
                                return [4 /*yield*/, this.lwaServiceClient.getAccessTokenForScope("alexa:skill_messaging")];
                            case 1:
                                accessToken = _a.sent();
                                authorizationValue = "Bearer " + accessToken;
                                headerParams.push({ key: "Authorization", value: authorizationValue });
                                resourcePath = "/v1/skillmessages/users/{userId}";
                                errorDefinitions = new Map();
                                errorDefinitions.set(202, "Message has been successfully accepted, and will be sent to the skill ");
                                errorDefinitions.set(400, "Data is missing or not valid ");
                                errorDefinitions.set(403, "The skill messaging authentication token is expired or not valid ");
                                errorDefinitions.set(404, "The passed userId does not exist ");
                                errorDefinitions.set(429, "The requester has exceeded their maximum allowable rate of messages ");
                                errorDefinitions.set(500, "The SkillMessaging service encountered an internal error for a valid request. ");
                                errorDefinitions.set(0, "Unexpected error");
                                return [2 /*return*/, this.invoke("POST", this.apiConfiguration.apiEndpoint, resourcePath, pathParams, queryParams, headerParams, sendSkillMessagingRequest, errorDefinitions)];
                        }
                    });
                });
            };
            /**
             * Send a message request to a skill for a specified user.
             * @param {string} userId The user Id for the specific user to send the message
             * @param {services.skillMessaging.SendSkillMessagingRequest} sendSkillMessagingRequest Message Request to be sent to the skill.
             */
            SkillMessagingServiceClient.prototype.sendSkillMessage = function (userId, sendSkillMessagingRequest) {
                return __awaiter(this, void 0, void 0, function () {
                    return __generator(this, function (_a) {
                        switch (_a.label) {
                            case 0: return [4 /*yield*/, this.callSendSkillMessage(userId, sendSkillMessagingRequest)];
                            case 1:
                                _a.sent();
                                return [2 /*return*/];
                        }
                    });
                });
            };
            return SkillMessagingServiceClient;
        }(services.BaseServiceClient));
        skillMessaging.SkillMessagingServiceClient = SkillMessagingServiceClient;
    })(skillMessaging = services.skillMessaging || (services.skillMessaging = {}));
})(services = exports.services || (exports.services = {}));
(function (services) {
    var timerManagement;
    (function (timerManagement) {
        /**
         *
        */
        var TimerManagementServiceClient = /** @class */ (function (_super) {
            __extends(TimerManagementServiceClient, _super);
            function TimerManagementServiceClient(apiConfiguration, customUserAgent) {
                if (customUserAgent === void 0) { customUserAgent = null; }
                var _this = _super.call(this, apiConfiguration) || this;
                _this.userAgent = createUserAgent("" + (__webpack_require__(288)/* .version */ .rE), customUserAgent);
                return _this;
            }
            /**
             * Delete all timers created by the skill.
             */
            TimerManagementServiceClient.prototype.callDeleteTimers = function () {
                return __awaiter(this, void 0, void 0, function () {
                    var __operationId__, queryParams, headerParams, pathParams, authorizationValue, resourcePath, errorDefinitions;
                    return __generator(this, function (_a) {
                        __operationId__ = 'callDeleteTimers';
                        queryParams = [];
                        headerParams = [];
                        headerParams.push({ key: 'User-Agent', value: this.userAgent });
                        pathParams = new Map();
                        authorizationValue = "Bearer " + this.apiConfiguration.authorizationValue;
                        headerParams.push({ key: "Authorization", value: authorizationValue });
                        resourcePath = "/v1/alerts/timers";
                        errorDefinitions = new Map();
                        errorDefinitions.set(200, "Success");
                        errorDefinitions.set(400, "Bad Request");
                        errorDefinitions.set(401, "Unauthorized");
                        errorDefinitions.set(500, "Internal Server Error");
                        return [2 /*return*/, this.invoke("DELETE", this.apiConfiguration.apiEndpoint, resourcePath, pathParams, queryParams, headerParams, null, errorDefinitions)];
                    });
                });
            };
            /**
             * Delete all timers created by the skill.
             */
            TimerManagementServiceClient.prototype.deleteTimers = function () {
                return __awaiter(this, void 0, void 0, function () {
                    return __generator(this, function (_a) {
                        switch (_a.label) {
                            case 0: return [4 /*yield*/, this.callDeleteTimers()];
                            case 1:
                                _a.sent();
                                return [2 /*return*/];
                        }
                    });
                });
            };
            /**
             * Get all timers created by the skill.
             */
            TimerManagementServiceClient.prototype.callGetTimers = function () {
                return __awaiter(this, void 0, void 0, function () {
                    var __operationId__, queryParams, headerParams, pathParams, authorizationValue, resourcePath, errorDefinitions;
                    return __generator(this, function (_a) {
                        __operationId__ = 'callGetTimers';
                        queryParams = [];
                        headerParams = [];
                        headerParams.push({ key: 'User-Agent', value: this.userAgent });
                        pathParams = new Map();
                        authorizationValue = "Bearer " + this.apiConfiguration.authorizationValue;
                        headerParams.push({ key: "Authorization", value: authorizationValue });
                        resourcePath = "/v1/alerts/timers";
                        errorDefinitions = new Map();
                        errorDefinitions.set(200, "Success");
                        errorDefinitions.set(400, "Bad Request");
                        errorDefinitions.set(401, "Unauthorized");
                        errorDefinitions.set(500, "Internal Server Error");
                        return [2 /*return*/, this.invoke("GET", this.apiConfiguration.apiEndpoint, resourcePath, pathParams, queryParams, headerParams, null, errorDefinitions)];
                    });
                });
            };
            /**
             * Get all timers created by the skill.
             */
            TimerManagementServiceClient.prototype.getTimers = function () {
                return __awaiter(this, void 0, void 0, function () {
                    var apiResponse;
                    return __generator(this, function (_a) {
                        switch (_a.label) {
                            case 0: return [4 /*yield*/, this.callGetTimers()];
                            case 1:
                                apiResponse = _a.sent();
                                return [2 /*return*/, apiResponse.body];
                        }
                    });
                });
            };
            /**
             * Delete a timer by ID.
             * @param {string} id
             */
            TimerManagementServiceClient.prototype.callDeleteTimer = function (id) {
                return __awaiter(this, void 0, void 0, function () {
                    var __operationId__, queryParams, headerParams, pathParams, authorizationValue, resourcePath, errorDefinitions;
                    return __generator(this, function (_a) {
                        __operationId__ = 'callDeleteTimer';
                        // verify required parameter 'id' is not null or undefined
                        if (id == null) {
                            throw new Error("Required parameter id was null or undefined when calling " + __operationId__ + ".");
                        }
                        queryParams = [];
                        headerParams = [];
                        headerParams.push({ key: 'User-Agent', value: this.userAgent });
                        pathParams = new Map();
                        pathParams.set('id', id);
                        authorizationValue = "Bearer " + this.apiConfiguration.authorizationValue;
                        headerParams.push({ key: "Authorization", value: authorizationValue });
                        resourcePath = "/v1/alerts/timers/{id}";
                        errorDefinitions = new Map();
                        errorDefinitions.set(200, "Success");
                        errorDefinitions.set(400, "Bad Request");
                        errorDefinitions.set(401, "Unauthorized");
                        errorDefinitions.set(404, "Timer not found");
                        errorDefinitions.set(500, "Internal Server Error");
                        return [2 /*return*/, this.invoke("DELETE", this.apiConfiguration.apiEndpoint, resourcePath, pathParams, queryParams, headerParams, null, errorDefinitions)];
                    });
                });
            };
            /**
             * Delete a timer by ID.
             * @param {string} id
             */
            TimerManagementServiceClient.prototype.deleteTimer = function (id) {
                return __awaiter(this, void 0, void 0, function () {
                    return __generator(this, function (_a) {
                        switch (_a.label) {
                            case 0: return [4 /*yield*/, this.callDeleteTimer(id)];
                            case 1:
                                _a.sent();
                                return [2 /*return*/];
                        }
                    });
                });
            };
            /**
             * Get timer by ID.
             * @param {string} id
             */
            TimerManagementServiceClient.prototype.callGetTimer = function (id) {
                return __awaiter(this, void 0, void 0, function () {
                    var __operationId__, queryParams, headerParams, pathParams, authorizationValue, resourcePath, errorDefinitions;
                    return __generator(this, function (_a) {
                        __operationId__ = 'callGetTimer';
                        // verify required parameter 'id' is not null or undefined
                        if (id == null) {
                            throw new Error("Required parameter id was null or undefined when calling " + __operationId__ + ".");
                        }
                        queryParams = [];
                        headerParams = [];
                        headerParams.push({ key: 'User-Agent', value: this.userAgent });
                        pathParams = new Map();
                        pathParams.set('id', id);
                        authorizationValue = "Bearer " + this.apiConfiguration.authorizationValue;
                        headerParams.push({ key: "Authorization", value: authorizationValue });
                        resourcePath = "/v1/alerts/timers/{id}";
                        errorDefinitions = new Map();
                        errorDefinitions.set(200, "Success");
                        errorDefinitions.set(400, "Bad Request");
                        errorDefinitions.set(401, "Unauthorized");
                        errorDefinitions.set(404, "Timer not found");
                        errorDefinitions.set(500, "Internal Server Error");
                        return [2 /*return*/, this.invoke("GET", this.apiConfiguration.apiEndpoint, resourcePath, pathParams, queryParams, headerParams, null, errorDefinitions)];
                    });
                });
            };
            /**
             * Get timer by ID.
             * @param {string} id
             */
            TimerManagementServiceClient.prototype.getTimer = function (id) {
                return __awaiter(this, void 0, void 0, function () {
                    var apiResponse;
                    return __generator(this, function (_a) {
                        switch (_a.label) {
                            case 0: return [4 /*yield*/, this.callGetTimer(id)];
                            case 1:
                                apiResponse = _a.sent();
                                return [2 /*return*/, apiResponse.body];
                        }
                    });
                });
            };
            /**
             * Pause a timer.
             * @param {string} id
             */
            TimerManagementServiceClient.prototype.callPauseTimer = function (id) {
                return __awaiter(this, void 0, void 0, function () {
                    var __operationId__, queryParams, headerParams, pathParams, authorizationValue, resourcePath, errorDefinitions;
                    return __generator(this, function (_a) {
                        __operationId__ = 'callPauseTimer';
                        // verify required parameter 'id' is not null or undefined
                        if (id == null) {
                            throw new Error("Required parameter id was null or undefined when calling " + __operationId__ + ".");
                        }
                        queryParams = [];
                        headerParams = [];
                        headerParams.push({ key: 'User-Agent', value: this.userAgent });
                        pathParams = new Map();
                        pathParams.set('id', id);
                        authorizationValue = "Bearer " + this.apiConfiguration.authorizationValue;
                        headerParams.push({ key: "Authorization", value: authorizationValue });
                        resourcePath = "/v1/alerts/timers/{id}/pause";
                        errorDefinitions = new Map();
                        errorDefinitions.set(200, "Success");
                        errorDefinitions.set(400, "Bad Request");
                        errorDefinitions.set(401, "Unauthorized");
                        errorDefinitions.set(404, "Timer not found");
                        errorDefinitions.set(500, "Internal Server Error");
                        errorDefinitions.set(504, "Device offline");
                        return [2 /*return*/, this.invoke("POST", this.apiConfiguration.apiEndpoint, resourcePath, pathParams, queryParams, headerParams, null, errorDefinitions)];
                    });
                });
            };
            /**
             * Pause a timer.
             * @param {string} id
             */
            TimerManagementServiceClient.prototype.pauseTimer = function (id) {
                return __awaiter(this, void 0, void 0, function () {
                    return __generator(this, function (_a) {
                        switch (_a.label) {
                            case 0: return [4 /*yield*/, this.callPauseTimer(id)];
                            case 1:
                                _a.sent();
                                return [2 /*return*/];
                        }
                    });
                });
            };
            /**
             * Resume a timer.
             * @param {string} id
             */
            TimerManagementServiceClient.prototype.callResumeTimer = function (id) {
                return __awaiter(this, void 0, void 0, function () {
                    var __operationId__, queryParams, headerParams, pathParams, authorizationValue, resourcePath, errorDefinitions;
                    return __generator(this, function (_a) {
                        __operationId__ = 'callResumeTimer';
                        // verify required parameter 'id' is not null or undefined
                        if (id == null) {
                            throw new Error("Required parameter id was null or undefined when calling " + __operationId__ + ".");
                        }
                        queryParams = [];
                        headerParams = [];
                        headerParams.push({ key: 'User-Agent', value: this.userAgent });
                        pathParams = new Map();
                        pathParams.set('id', id);
                        authorizationValue = "Bearer " + this.apiConfiguration.authorizationValue;
                        headerParams.push({ key: "Authorization", value: authorizationValue });
                        resourcePath = "/v1/alerts/timers/{id}/resume";
                        errorDefinitions = new Map();
                        errorDefinitions.set(200, "Success");
                        errorDefinitions.set(400, "Bad Request");
                        errorDefinitions.set(401, "Unauthorized");
                        errorDefinitions.set(404, "Timer not found");
                        errorDefinitions.set(500, "Internal Server Error");
                        errorDefinitions.set(504, "Device offline");
                        return [2 /*return*/, this.invoke("POST", this.apiConfiguration.apiEndpoint, resourcePath, pathParams, queryParams, headerParams, null, errorDefinitions)];
                    });
                });
            };
            /**
             * Resume a timer.
             * @param {string} id
             */
            TimerManagementServiceClient.prototype.resumeTimer = function (id) {
                return __awaiter(this, void 0, void 0, function () {
                    return __generator(this, function (_a) {
                        switch (_a.label) {
                            case 0: return [4 /*yield*/, this.callResumeTimer(id)];
                            case 1:
                                _a.sent();
                                return [2 /*return*/];
                        }
                    });
                });
            };
            /**
             * Create a new timer.
             * @param {services.timerManagement.TimerRequest} timerRequest
             */
            TimerManagementServiceClient.prototype.callCreateTimer = function (timerRequest) {
                return __awaiter(this, void 0, void 0, function () {
                    var __operationId__, queryParams, headerParams, pathParams, authorizationValue, resourcePath, errorDefinitions;
                    return __generator(this, function (_a) {
                        __operationId__ = 'callCreateTimer';
                        // verify required parameter 'timerRequest' is not null or undefined
                        if (timerRequest == null) {
                            throw new Error("Required parameter timerRequest was null or undefined when calling " + __operationId__ + ".");
                        }
                        queryParams = [];
                        headerParams = [];
                        headerParams.push({ key: 'User-Agent', value: this.userAgent });
                        if (!headerParams.find(function (param) { return param.key.toLowerCase() === 'content-type'; })) {
                            headerParams.push({ key: 'Content-type', value: 'application/json' });
                        }
                        pathParams = new Map();
                        authorizationValue = "Bearer " + this.apiConfiguration.authorizationValue;
                        headerParams.push({ key: "Authorization", value: authorizationValue });
                        resourcePath = "/v1/alerts/timers";
                        errorDefinitions = new Map();
                        errorDefinitions.set(200, "Success");
                        errorDefinitions.set(400, "Bad Request");
                        errorDefinitions.set(401, "Unauthorized");
                        errorDefinitions.set(403, "Forbidden");
                        errorDefinitions.set(500, "Internal Server Error");
                        errorDefinitions.set(504, "Device offline");
                        return [2 /*return*/, this.invoke("POST", this.apiConfiguration.apiEndpoint, resourcePath, pathParams, queryParams, headerParams, timerRequest, errorDefinitions)];
                    });
                });
            };
            /**
             * Create a new timer.
             * @param {services.timerManagement.TimerRequest} timerRequest
             */
            TimerManagementServiceClient.prototype.createTimer = function (timerRequest) {
                return __awaiter(this, void 0, void 0, function () {
                    var apiResponse;
                    return __generator(this, function (_a) {
                        switch (_a.label) {
                            case 0: return [4 /*yield*/, this.callCreateTimer(timerRequest)];
                            case 1:
                                apiResponse = _a.sent();
                                return [2 /*return*/, apiResponse.body];
                        }
                    });
                });
            };
            return TimerManagementServiceClient;
        }(services.BaseServiceClient));
        timerManagement.TimerManagementServiceClient = TimerManagementServiceClient;
    })(timerManagement = services.timerManagement || (services.timerManagement = {}));
})(services = exports.services || (exports.services = {}));
(function (services) {
    var ups;
    (function (ups) {
        /**
         *
        */
        var UpsServiceClient = /** @class */ (function (_super) {
            __extends(UpsServiceClient, _super);
            function UpsServiceClient(apiConfiguration, customUserAgent) {
                if (customUserAgent === void 0) { customUserAgent = null; }
                var _this = _super.call(this, apiConfiguration) || this;
                _this.userAgent = createUserAgent("" + (__webpack_require__(288)/* .version */ .rE), customUserAgent);
                return _this;
            }
            /**
             * Gets the email address of the customer associated with the current enablement. Requires customer consent for scopes: [alexa::profile:email:read]
             */
            UpsServiceClient.prototype.callGetProfileEmail = function () {
                return __awaiter(this, void 0, void 0, function () {
                    var __operationId__, queryParams, headerParams, pathParams, authorizationValue, resourcePath, errorDefinitions;
                    return __generator(this, function (_a) {
                        __operationId__ = 'callGetProfileEmail';
                        queryParams = [];
                        headerParams = [];
                        headerParams.push({ key: 'User-Agent', value: this.userAgent });
                        pathParams = new Map();
                        authorizationValue = "Bearer " + this.apiConfiguration.authorizationValue;
                        headerParams.push({ key: "Authorization", value: authorizationValue });
                        resourcePath = "/v2/accounts/~current/settings/Profile.email";
                        errorDefinitions = new Map();
                        errorDefinitions.set(200, "Successfully retrieved the requested information.");
                        errorDefinitions.set(204, "The query did not return any results.");
                        errorDefinitions.set(401, "The authentication token is malformed or invalid.");
                        errorDefinitions.set(403, "The authentication token does not have access to resource.");
                        errorDefinitions.set(429, "The skill has been throttled due to an excessive number of requests.");
                        errorDefinitions.set(0, "An unexpected error occurred.");
                        return [2 /*return*/, this.invoke("GET", this.apiConfiguration.apiEndpoint, resourcePath, pathParams, queryParams, headerParams, null, errorDefinitions)];
                    });
                });
            };
            /**
             * Gets the email address of the customer associated with the current enablement. Requires customer consent for scopes: [alexa::profile:email:read]
             */
            UpsServiceClient.prototype.getProfileEmail = function () {
                return __awaiter(this, void 0, void 0, function () {
                    var apiResponse;
                    return __generator(this, function (_a) {
                        switch (_a.label) {
                            case 0: return [4 /*yield*/, this.callGetProfileEmail()];
                            case 1:
                                apiResponse = _a.sent();
                                return [2 /*return*/, apiResponse.body];
                        }
                    });
                });
            };
            /**
             * Gets the given name (first name) of the customer associated with the current enablement. Requires customer consent for scopes: [alexa::profile:given_name:read]
             */
            UpsServiceClient.prototype.callGetProfileGivenName = function () {
                return __awaiter(this, void 0, void 0, function () {
                    var __operationId__, queryParams, headerParams, pathParams, authorizationValue, resourcePath, errorDefinitions;
                    return __generator(this, function (_a) {
                        __operationId__ = 'callGetProfileGivenName';
                        queryParams = [];
                        headerParams = [];
                        headerParams.push({ key: 'User-Agent', value: this.userAgent });
                        pathParams = new Map();
                        authorizationValue = "Bearer " + this.apiConfiguration.authorizationValue;
                        headerParams.push({ key: "Authorization", value: authorizationValue });
                        resourcePath = "/v2/accounts/~current/settings/Profile.givenName";
                        errorDefinitions = new Map();
                        errorDefinitions.set(200, "Successfully retrieved the requested information.");
                        errorDefinitions.set(204, "The query did not return any results.");
                        errorDefinitions.set(401, "The authentication token is malformed or invalid.");
                        errorDefinitions.set(403, "The authentication token does not have access to resource.");
                        errorDefinitions.set(429, "The skill has been throttled due to an excessive number of requests.");
                        errorDefinitions.set(0, "An unexpected error occurred.");
                        return [2 /*return*/, this.invoke("GET", this.apiConfiguration.apiEndpoint, resourcePath, pathParams, queryParams, headerParams, null, errorDefinitions)];
                    });
                });
            };
            /**
             * Gets the given name (first name) of the customer associated with the current enablement. Requires customer consent for scopes: [alexa::profile:given_name:read]
             */
            UpsServiceClient.prototype.getProfileGivenName = function () {
                return __awaiter(this, void 0, void 0, function () {
                    var apiResponse;
                    return __generator(this, function (_a) {
                        switch (_a.label) {
                            case 0: return [4 /*yield*/, this.callGetProfileGivenName()];
                            case 1:
                                apiResponse = _a.sent();
                                return [2 /*return*/, apiResponse.body];
                        }
                    });
                });
            };
            /**
             * Gets the mobile phone number of the customer associated with the current enablement. Requires customer consent for scopes: [alexa::profile:mobile_number:read]
             */
            UpsServiceClient.prototype.callGetProfileMobileNumber = function () {
                return __awaiter(this, void 0, void 0, function () {
                    var __operationId__, queryParams, headerParams, pathParams, authorizationValue, resourcePath, errorDefinitions;
                    return __generator(this, function (_a) {
                        __operationId__ = 'callGetProfileMobileNumber';
                        queryParams = [];
                        headerParams = [];
                        headerParams.push({ key: 'User-Agent', value: this.userAgent });
                        pathParams = new Map();
                        authorizationValue = "Bearer " + this.apiConfiguration.authorizationValue;
                        headerParams.push({ key: "Authorization", value: authorizationValue });
                        resourcePath = "/v2/accounts/~current/settings/Profile.mobileNumber";
                        errorDefinitions = new Map();
                        errorDefinitions.set(200, "Successfully retrieved the requested information.");
                        errorDefinitions.set(204, "The query did not return any results.");
                        errorDefinitions.set(401, "The authentication token is malformed or invalid.");
                        errorDefinitions.set(403, "The authentication token does not have access to resource.");
                        errorDefinitions.set(429, "The skill has been throttled due to an excessive number of requests.");
                        errorDefinitions.set(0, "An unexpected error occurred.");
                        return [2 /*return*/, this.invoke("GET", this.apiConfiguration.apiEndpoint, resourcePath, pathParams, queryParams, headerParams, null, errorDefinitions)];
                    });
                });
            };
            /**
             * Gets the mobile phone number of the customer associated with the current enablement. Requires customer consent for scopes: [alexa::profile:mobile_number:read]
             */
            UpsServiceClient.prototype.getProfileMobileNumber = function () {
                return __awaiter(this, void 0, void 0, function () {
                    var apiResponse;
                    return __generator(this, function (_a) {
                        switch (_a.label) {
                            case 0: return [4 /*yield*/, this.callGetProfileMobileNumber()];
                            case 1:
                                apiResponse = _a.sent();
                                return [2 /*return*/, apiResponse.body];
                        }
                    });
                });
            };
            /**
             * Gets the full name of the customer associated with the current enablement. Requires customer consent for scopes: [alexa::profile:name:read]
             */
            UpsServiceClient.prototype.callGetProfileName = function () {
                return __awaiter(this, void 0, void 0, function () {
                    var __operationId__, queryParams, headerParams, pathParams, authorizationValue, resourcePath, errorDefinitions;
                    return __generator(this, function (_a) {
                        __operationId__ = 'callGetProfileName';
                        queryParams = [];
                        headerParams = [];
                        headerParams.push({ key: 'User-Agent', value: this.userAgent });
                        pathParams = new Map();
                        authorizationValue = "Bearer " + this.apiConfiguration.authorizationValue;
                        headerParams.push({ key: "Authorization", value: authorizationValue });
                        resourcePath = "/v2/accounts/~current/settings/Profile.name";
                        errorDefinitions = new Map();
                        errorDefinitions.set(200, "Successfully retrieved the requested information.");
                        errorDefinitions.set(204, "The query did not return any results.");
                        errorDefinitions.set(401, "The authentication token is malformed or invalid.");
                        errorDefinitions.set(403, "The authentication token does not have access to resource.");
                        errorDefinitions.set(429, "The skill has been throttled due to an excessive number of requests.");
                        errorDefinitions.set(0, "An unexpected error occurred.");
                        return [2 /*return*/, this.invoke("GET", this.apiConfiguration.apiEndpoint, resourcePath, pathParams, queryParams, headerParams, null, errorDefinitions)];
                    });
                });
            };
            /**
             * Gets the full name of the customer associated with the current enablement. Requires customer consent for scopes: [alexa::profile:name:read]
             */
            UpsServiceClient.prototype.getProfileName = function () {
                return __awaiter(this, void 0, void 0, function () {
                    var apiResponse;
                    return __generator(this, function (_a) {
                        switch (_a.label) {
                            case 0: return [4 /*yield*/, this.callGetProfileName()];
                            case 1:
                                apiResponse = _a.sent();
                                return [2 /*return*/, apiResponse.body];
                        }
                    });
                });
            };
            /**
             * Gets the distance measurement unit of the device. Does not require explict customer consent.
             * @param {string} deviceId The device Id
             */
            UpsServiceClient.prototype.callGetSystemDistanceUnits = function (deviceId) {
                return __awaiter(this, void 0, void 0, function () {
                    var __operationId__, queryParams, headerParams, pathParams, authorizationValue, resourcePath, errorDefinitions;
                    return __generator(this, function (_a) {
                        __operationId__ = 'callGetSystemDistanceUnits';
                        // verify required parameter 'deviceId' is not null or undefined
                        if (deviceId == null) {
                            throw new Error("Required parameter deviceId was null or undefined when calling " + __operationId__ + ".");
                        }
                        queryParams = [];
                        headerParams = [];
                        headerParams.push({ key: 'User-Agent', value: this.userAgent });
                        pathParams = new Map();
                        pathParams.set('deviceId', deviceId);
                        authorizationValue = "Bearer " + this.apiConfiguration.authorizationValue;
                        headerParams.push({ key: "Authorization", value: authorizationValue });
                        resourcePath = "/v2/devices/{deviceId}/settings/System.distanceUnits";
                        errorDefinitions = new Map();
                        errorDefinitions.set(200, "Successfully get the setting");
                        errorDefinitions.set(204, "The query did not return any results.");
                        errorDefinitions.set(401, "The authentication token is malformed or invalid.");
                        errorDefinitions.set(403, "The authentication token does not have access to resource.");
                        errorDefinitions.set(429, "The skill has been throttled due to an excessive number of requests.");
                        errorDefinitions.set(0, "An unexpected error occurred.");
                        return [2 /*return*/, this.invoke("GET", this.apiConfiguration.apiEndpoint, resourcePath, pathParams, queryParams, headerParams, null, errorDefinitions)];
                    });
                });
            };
            /**
             * Gets the distance measurement unit of the device. Does not require explict customer consent.
             * @param {string} deviceId The device Id
             */
            UpsServiceClient.prototype.getSystemDistanceUnits = function (deviceId) {
                return __awaiter(this, void 0, void 0, function () {
                    var apiResponse;
                    return __generator(this, function (_a) {
                        switch (_a.label) {
                            case 0: return [4 /*yield*/, this.callGetSystemDistanceUnits(deviceId)];
                            case 1:
                                apiResponse = _a.sent();
                                return [2 /*return*/, apiResponse.body];
                        }
                    });
                });
            };
            /**
             * Gets the temperature measurement units of the device. Does not require explict customer consent.
             * @param {string} deviceId The device Id
             */
            UpsServiceClient.prototype.callGetSystemTemperatureUnit = function (deviceId) {
                return __awaiter(this, void 0, void 0, function () {
                    var __operationId__, queryParams, headerParams, pathParams, authorizationValue, resourcePath, errorDefinitions;
                    return __generator(this, function (_a) {
                        __operationId__ = 'callGetSystemTemperatureUnit';
                        // verify required parameter 'deviceId' is not null or undefined
                        if (deviceId == null) {
                            throw new Error("Required parameter deviceId was null or undefined when calling " + __operationId__ + ".");
                        }
                        queryParams = [];
                        headerParams = [];
                        headerParams.push({ key: 'User-Agent', value: this.userAgent });
                        pathParams = new Map();
                        pathParams.set('deviceId', deviceId);
                        authorizationValue = "Bearer " + this.apiConfiguration.authorizationValue;
                        headerParams.push({ key: "Authorization", value: authorizationValue });
                        resourcePath = "/v2/devices/{deviceId}/settings/System.temperatureUnit";
                        errorDefinitions = new Map();
                        errorDefinitions.set(200, "Successfully get the setting");
                        errorDefinitions.set(204, "The query did not return any results.");
                        errorDefinitions.set(401, "The authentication token is malformed or invalid.");
                        errorDefinitions.set(403, "The authentication token does not have access to resource.");
                        errorDefinitions.set(429, "The skill has been throttled due to an excessive number of requests.");
                        errorDefinitions.set(0, "An unexpected error occurred.");
                        return [2 /*return*/, this.invoke("GET", this.apiConfiguration.apiEndpoint, resourcePath, pathParams, queryParams, headerParams, null, errorDefinitions)];
                    });
                });
            };
            /**
             * Gets the temperature measurement units of the device. Does not require explict customer consent.
             * @param {string} deviceId The device Id
             */
            UpsServiceClient.prototype.getSystemTemperatureUnit = function (deviceId) {
                return __awaiter(this, void 0, void 0, function () {
                    var apiResponse;
                    return __generator(this, function (_a) {
                        switch (_a.label) {
                            case 0: return [4 /*yield*/, this.callGetSystemTemperatureUnit(deviceId)];
                            case 1:
                                apiResponse = _a.sent();
                                return [2 /*return*/, apiResponse.body];
                        }
                    });
                });
            };
            /**
             * Gets the time zone of the device. Does not require explict customer consent.
             * @param {string} deviceId The device Id
             */
            UpsServiceClient.prototype.callGetSystemTimeZone = function (deviceId) {
                return __awaiter(this, void 0, void 0, function () {
                    var __operationId__, queryParams, headerParams, pathParams, authorizationValue, resourcePath, errorDefinitions;
                    return __generator(this, function (_a) {
                        __operationId__ = 'callGetSystemTimeZone';
                        // verify required parameter 'deviceId' is not null or undefined
                        if (deviceId == null) {
                            throw new Error("Required parameter deviceId was null or undefined when calling " + __operationId__ + ".");
                        }
                        queryParams = [];
                        headerParams = [];
                        headerParams.push({ key: 'User-Agent', value: this.userAgent });
                        pathParams = new Map();
                        pathParams.set('deviceId', deviceId);
                        authorizationValue = "Bearer " + this.apiConfiguration.authorizationValue;
                        headerParams.push({ key: "Authorization", value: authorizationValue });
                        resourcePath = "/v2/devices/{deviceId}/settings/System.timeZone";
                        errorDefinitions = new Map();
                        errorDefinitions.set(200, "Successfully get the setting");
                        errorDefinitions.set(204, "The query did not return any results.");
                        errorDefinitions.set(401, "The authentication token is malformed or invalid.");
                        errorDefinitions.set(403, "The authentication token does not have access to resource.");
                        errorDefinitions.set(429, "The skill has been throttled due to an excessive number of requests.");
                        errorDefinitions.set(0, "An unexpected error occurred.");
                        return [2 /*return*/, this.invoke("GET", this.apiConfiguration.apiEndpoint, resourcePath, pathParams, queryParams, headerParams, null, errorDefinitions)];
                    });
                });
            };
            /**
             * Gets the time zone of the device. Does not require explict customer consent.
             * @param {string} deviceId The device Id
             */
            UpsServiceClient.prototype.getSystemTimeZone = function (deviceId) {
                return __awaiter(this, void 0, void 0, function () {
                    var apiResponse;
                    return __generator(this, function (_a) {
                        switch (_a.label) {
                            case 0: return [4 /*yield*/, this.callGetSystemTimeZone(deviceId)];
                            case 1:
                                apiResponse = _a.sent();
                                return [2 /*return*/, apiResponse.body];
                        }
                    });
                });
            };
            /**
             * Gets the given name (first name) of the recognized speaker at person-level. Requires speaker consent at person-level for scopes: [alexa::profile:given_name:read]
             */
            UpsServiceClient.prototype.callGetPersonsProfileGivenName = function () {
                return __awaiter(this, void 0, void 0, function () {
                    var __operationId__, queryParams, headerParams, pathParams, authorizationValue, resourcePath, errorDefinitions;
                    return __generator(this, function (_a) {
                        __operationId__ = 'callGetPersonsProfileGivenName';
                        queryParams = [];
                        headerParams = [];
                        headerParams.push({ key: 'User-Agent', value: this.userAgent });
                        pathParams = new Map();
                        authorizationValue = "Bearer " + this.apiConfiguration.authorizationValue;
                        headerParams.push({ key: "Authorization", value: authorizationValue });
                        resourcePath = "/v2/persons/~current/profile/givenName";
                        errorDefinitions = new Map();
                        errorDefinitions.set(200, "Successfully retrieved the requested information.");
                        errorDefinitions.set(204, "The query did not return any results.");
                        errorDefinitions.set(401, "The authentication token is malformed or invalid.");
                        errorDefinitions.set(403, "The authentication token does not have access to resource.");
                        errorDefinitions.set(429, "The skill has been throttled due to an excessive number of requests.");
                        errorDefinitions.set(0, "An unexpected error occurred.");
                        return [2 /*return*/, this.invoke("GET", this.apiConfiguration.apiEndpoint, resourcePath, pathParams, queryParams, headerParams, null, errorDefinitions)];
                    });
                });
            };
            /**
             * Gets the given name (first name) of the recognized speaker at person-level. Requires speaker consent at person-level for scopes: [alexa::profile:given_name:read]
             */
            UpsServiceClient.prototype.getPersonsProfileGivenName = function () {
                return __awaiter(this, void 0, void 0, function () {
                    var apiResponse;
                    return __generator(this, function (_a) {
                        switch (_a.label) {
                            case 0: return [4 /*yield*/, this.callGetPersonsProfileGivenName()];
                            case 1:
                                apiResponse = _a.sent();
                                return [2 /*return*/, apiResponse.body];
                        }
                    });
                });
            };
            /**
             * Gets the mobile phone number of the recognized speaker at person-level. Requires speaker consent at person-level for scopes: [alexa::profile:mobile_number:read]
             */
            UpsServiceClient.prototype.callGetPersonsProfileMobileNumber = function () {
                return __awaiter(this, void 0, void 0, function () {
                    var __operationId__, queryParams, headerParams, pathParams, authorizationValue, resourcePath, errorDefinitions;
                    return __generator(this, function (_a) {
                        __operationId__ = 'callGetPersonsProfileMobileNumber';
                        queryParams = [];
                        headerParams = [];
                        headerParams.push({ key: 'User-Agent', value: this.userAgent });
                        pathParams = new Map();
                        authorizationValue = "Bearer " + this.apiConfiguration.authorizationValue;
                        headerParams.push({ key: "Authorization", value: authorizationValue });
                        resourcePath = "/v2/persons/~current/profile/mobileNumber";
                        errorDefinitions = new Map();
                        errorDefinitions.set(200, "Successfully retrieved the requested information.");
                        errorDefinitions.set(204, "The query did not return any results.");
                        errorDefinitions.set(401, "The authentication token is malformed or invalid.");
                        errorDefinitions.set(403, "The authentication token does not have access to resource.");
                        errorDefinitions.set(429, "The skill has been throttled due to an excessive number of requests.");
                        errorDefinitions.set(0, "An unexpected error occurred.");
                        return [2 /*return*/, this.invoke("GET", this.apiConfiguration.apiEndpoint, resourcePath, pathParams, queryParams, headerParams, null, errorDefinitions)];
                    });
                });
            };
            /**
             * Gets the mobile phone number of the recognized speaker at person-level. Requires speaker consent at person-level for scopes: [alexa::profile:mobile_number:read]
             */
            UpsServiceClient.prototype.getPersonsProfileMobileNumber = function () {
                return __awaiter(this, void 0, void 0, function () {
                    var apiResponse;
                    return __generator(this, function (_a) {
                        switch (_a.label) {
                            case 0: return [4 /*yield*/, this.callGetPersonsProfileMobileNumber()];
                            case 1:
                                apiResponse = _a.sent();
                                return [2 /*return*/, apiResponse.body];
                        }
                    });
                });
            };
            /**
             * Gets the full name of the recognized speaker at person-level. Requires speaker consent at person-level for scopes: [alexa::profile:name:read]
             */
            UpsServiceClient.prototype.callGetPersonsProfileName = function () {
                return __awaiter(this, void 0, void 0, function () {
                    var __operationId__, queryParams, headerParams, pathParams, authorizationValue, resourcePath, errorDefinitions;
                    return __generator(this, function (_a) {
                        __operationId__ = 'callGetPersonsProfileName';
                        queryParams = [];
                        headerParams = [];
                        headerParams.push({ key: 'User-Agent', value: this.userAgent });
                        pathParams = new Map();
                        authorizationValue = "Bearer " + this.apiConfiguration.authorizationValue;
                        headerParams.push({ key: "Authorization", value: authorizationValue });
                        resourcePath = "/v2/persons/~current/profile/name";
                        errorDefinitions = new Map();
                        errorDefinitions.set(200, "Successfully retrieved the requested information.");
                        errorDefinitions.set(204, "The query did not return any results.");
                        errorDefinitions.set(401, "The authentication token is malformed or invalid.");
                        errorDefinitions.set(403, "The authentication token does not have access to resource.");
                        errorDefinitions.set(429, "The skill has been throttled due to an excessive number of requests.");
                        errorDefinitions.set(0, "An unexpected error occurred.");
                        return [2 /*return*/, this.invoke("GET", this.apiConfiguration.apiEndpoint, resourcePath, pathParams, queryParams, headerParams, null, errorDefinitions)];
                    });
                });
            };
            /**
             * Gets the full name of the recognized speaker at person-level. Requires speaker consent at person-level for scopes: [alexa::profile:name:read]
             */
            UpsServiceClient.prototype.getPersonsProfileName = function () {
                return __awaiter(this, void 0, void 0, function () {
                    var apiResponse;
                    return __generator(this, function (_a) {
                        switch (_a.label) {
                            case 0: return [4 /*yield*/, this.callGetPersonsProfileName()];
                            case 1:
                                apiResponse = _a.sent();
                                return [2 /*return*/, apiResponse.body];
                        }
                    });
                });
            };
            return UpsServiceClient;
        }(services.BaseServiceClient));
        ups.UpsServiceClient = UpsServiceClient;
    })(ups = services.ups || (services.ups = {}));
})(services = exports.services || (exports.services = {}));
(function (services) {
    /**
     * Helper class that instantiates an ServiceClient implementation automatically resolving its
     * required ApiConfiguration.
     * @export
     * @class ServiceClientFactory
     */
    var ServiceClientFactory = /** @class */ (function () {
        function ServiceClientFactory(apiConfiguration) {
            this.apiConfiguration = apiConfiguration;
        }
        /*
         * Gets an instance of { deviceAddress.DeviceAddressService }.
         * @returns { deviceAddress.DeviceAddressService }
         */
        ServiceClientFactory.prototype.getDeviceAddressServiceClient = function () {
            try {
                return new services.deviceAddress.DeviceAddressServiceClient(this.apiConfiguration);
            }
            catch (e) {
                var factoryError = new Error("ServiceClientFactory Error while initializing DeviceAddressServiceClient: " + e.message);
                factoryError['name'] = 'ServiceClientFactoryError';
                throw factoryError;
            }
        };
        /*
         * Gets an instance of { directive.DirectiveService }.
         * @returns { directive.DirectiveService }
         */
        ServiceClientFactory.prototype.getDirectiveServiceClient = function () {
            try {
                return new services.directive.DirectiveServiceClient(this.apiConfiguration);
            }
            catch (e) {
                var factoryError = new Error("ServiceClientFactory Error while initializing DirectiveServiceClient: " + e.message);
                factoryError['name'] = 'ServiceClientFactoryError';
                throw factoryError;
            }
        };
        /*
         * Gets an instance of { endpointEnumeration.EndpointEnumerationService }.
         * @returns { endpointEnumeration.EndpointEnumerationService }
         */
        ServiceClientFactory.prototype.getEndpointEnumerationServiceClient = function () {
            try {
                return new services.endpointEnumeration.EndpointEnumerationServiceClient(this.apiConfiguration);
            }
            catch (e) {
                var factoryError = new Error("ServiceClientFactory Error while initializing EndpointEnumerationServiceClient: " + e.message);
                factoryError['name'] = 'ServiceClientFactoryError';
                throw factoryError;
            }
        };
        /*
         * Gets an instance of { listManagement.ListManagementService }.
         * @returns { listManagement.ListManagementService }
         */
        ServiceClientFactory.prototype.getListManagementServiceClient = function () {
            try {
                return new services.listManagement.ListManagementServiceClient(this.apiConfiguration);
            }
            catch (e) {
                var factoryError = new Error("ServiceClientFactory Error while initializing ListManagementServiceClient: " + e.message);
                factoryError['name'] = 'ServiceClientFactoryError';
                throw factoryError;
            }
        };
        /*
         * Gets an instance of { monetization.MonetizationService }.
         * @returns { monetization.MonetizationService }
         */
        ServiceClientFactory.prototype.getMonetizationServiceClient = function () {
            try {
                return new services.monetization.MonetizationServiceClient(this.apiConfiguration);
            }
            catch (e) {
                var factoryError = new Error("ServiceClientFactory Error while initializing MonetizationServiceClient: " + e.message);
                factoryError['name'] = 'ServiceClientFactoryError';
                throw factoryError;
            }
        };
        /*
         * Gets an instance of { reminderManagement.ReminderManagementService }.
         * @returns { reminderManagement.ReminderManagementService }
         */
        ServiceClientFactory.prototype.getReminderManagementServiceClient = function () {
            try {
                return new services.reminderManagement.ReminderManagementServiceClient(this.apiConfiguration);
            }
            catch (e) {
                var factoryError = new Error("ServiceClientFactory Error while initializing ReminderManagementServiceClient: " + e.message);
                factoryError['name'] = 'ServiceClientFactoryError';
                throw factoryError;
            }
        };
        /*
         * Gets an instance of { timerManagement.TimerManagementService }.
         * @returns { timerManagement.TimerManagementService }
         */
        ServiceClientFactory.prototype.getTimerManagementServiceClient = function () {
            try {
                return new services.timerManagement.TimerManagementServiceClient(this.apiConfiguration);
            }
            catch (e) {
                var factoryError = new Error("ServiceClientFactory Error while initializing TimerManagementServiceClient: " + e.message);
                factoryError['name'] = 'ServiceClientFactoryError';
                throw factoryError;
            }
        };
        /*
         * Gets an instance of { ups.UpsService }.
         * @returns { ups.UpsService }
         */
        ServiceClientFactory.prototype.getUpsServiceClient = function () {
            try {
                return new services.ups.UpsServiceClient(this.apiConfiguration);
            }
            catch (e) {
                var factoryError = new Error("ServiceClientFactory Error while initializing UpsServiceClient: " + e.message);
                factoryError['name'] = 'ServiceClientFactoryError';
                throw factoryError;
            }
        };
        return ServiceClientFactory;
    }());
    services.ServiceClientFactory = ServiceClientFactory;
})(services = exports.services || (exports.services = {}));
//# sourceMappingURL=index.js.map

/***/ }),

/***/ 818:
/***/ ((__unused_webpack_module, exports, __webpack_require__) => {


/*
 * Copyright 2018 Amazon.com, Inc. or its affiliates. All Rights Reserved.
 * Licensed under the Apache License, Version 2.0 (the "License").
 * You may not use this file except in compliance with the License.
 * A copy of the License is located at
 *      http://www.apache.org/licenses/LICENSE-2.0
 *
 * or in the "license" file accompanying this file. This file is distributed
 * on an "AS IS" BASIS, WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either
 * express or implied. See the License for the specific language governing
 * permissions and limitations under the License.
 */
Object.defineProperty(exports, "__esModule", ({ value: true }));
exports.AttributesManagerFactory = void 0;
const ask_sdk_runtime_1 = __webpack_require__(995);
/**
 * Provider for attributes that can be stored on three levels: request, session and persistence.
 */
class AttributesManagerFactory {
    static init(options) {
        if (!options.requestEnvelope) {
            throw (0, ask_sdk_runtime_1.createAskSdkError)('AttributesManagerFactory', 'RequestEnvelope cannot be null or undefined!');
        }
        let thisRequestAttributes = {};
        let thisSessionAttributes = options.requestEnvelope.session
            ? options.requestEnvelope.session.attributes
                ? JSON.parse(JSON.stringify(options.requestEnvelope.session.attributes))
                : {}
            : undefined;
        let thisPersistentAttributes;
        let persistentAttributesSet = false;
        return {
            getRequestAttributes() {
                return thisRequestAttributes;
            },
            getSessionAttributes() {
                if (!options.requestEnvelope.session) {
                    throw (0, ask_sdk_runtime_1.createAskSdkError)('AttributesManager', 'Cannot get SessionAttributes from out of session request!');
                }
                return thisSessionAttributes;
            },
            async getPersistentAttributes(useSessionCache = true, defaultAttributes) {
                if (!options.persistenceAdapter) {
                    throw (0, ask_sdk_runtime_1.createAskSdkError)('AttributesManager', 'Cannot get PersistentAttributes without PersistenceManager');
                }
                if (!persistentAttributesSet || !useSessionCache) {
                    thisPersistentAttributes = await options.persistenceAdapter.getAttributes(options.requestEnvelope);
                    persistentAttributesSet = true;
                }
                if (defaultAttributes && (!thisPersistentAttributes || Object.keys(thisPersistentAttributes).length < 1)) {
                    thisPersistentAttributes = defaultAttributes;
                }
                return thisPersistentAttributes;
            },
            setRequestAttributes(requestAttributes) {
                thisRequestAttributes = requestAttributes;
            },
            setSessionAttributes(sessionAttributes) {
                if (!options.requestEnvelope.session) {
                    throw (0, ask_sdk_runtime_1.createAskSdkError)('AttributesManager', 'Cannot set SessionAttributes to out of session request!');
                }
                thisSessionAttributes = sessionAttributes;
            },
            setPersistentAttributes(persistentAttributes) {
                if (!options.persistenceAdapter) {
                    throw (0, ask_sdk_runtime_1.createAskSdkError)('AttributesManager', 'Cannot set PersistentAttributes without persistence adapter!');
                }
                thisPersistentAttributes = persistentAttributes;
                persistentAttributesSet = true;
            },
            async savePersistentAttributes() {
                if (!options.persistenceAdapter) {
                    throw (0, ask_sdk_runtime_1.createAskSdkError)('AttributesManager', 'Cannot save PersistentAttributes without persistence adapter!');
                }
                if (persistentAttributesSet) {
                    await options.persistenceAdapter.saveAttributes(options.requestEnvelope, thisPersistentAttributes);
                }
            },
            async deletePersistentAttributes() {
                if (!options.persistenceAdapter) {
                    throw (0, ask_sdk_runtime_1.createAskSdkError)('AttributesManager', 'Cannot delete PersistentAttributes without persistence adapter!');
                }
                await options.persistenceAdapter.deleteAttributes(options.requestEnvelope);
                thisPersistentAttributes = undefined;
                persistentAttributesSet = false;
            },
        };
    }
    constructor() { }
}
exports.AttributesManagerFactory = AttributesManagerFactory;
//# sourceMappingURL=AttributesManagerFactory.js.map

/***/ }),

/***/ 834:
/***/ ((__unused_webpack_module, exports, __webpack_require__) => {


/*
 * Copyright 2018 Amazon.com, Inc. or its affiliates. All Rights Reserved.
 * Licensed under the Apache License, Version 2.0 (the "License").
 * You may not use this file except in compliance with the License.
 * A copy of the License is located at
 *      http://www.apache.org/licenses/LICENSE-2.0
 *
 * or in the "license" file accompanying this file. This file is distributed
 * on an "AS IS" BASIS, WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either
 * express or implied. See the License for the specific language governing
 * permissions and limitations under the License.
 */
Object.defineProperty(exports, "__esModule", ({ value: true }));
exports.RichTextContentHelper = void 0;
const TextContentHelper_1 = __webpack_require__(36);
/**
 * Responsible for building rich text content object using ask-sdk-model in Alexa skills kit display interface
 * https://developer.amazon.com/docs/custom-skills/display-interface-reference.html#textcontent-object-specifications.
 */
class RichTextContentHelper extends TextContentHelper_1.TextContentHelper {
    constructor() {
        super();
    }
    /**
     * @returns {interfaces.display.TextContent}
     */
    getTextContent() {
        const textContent = {};
        if (this.primaryText) {
            textContent.primaryText = {
                type: 'RichText',
                text: this.primaryText,
            };
        }
        if (this.secondaryText) {
            textContent.secondaryText = {
                type: 'RichText',
                text: this.secondaryText,
            };
        }
        if (this.tertiaryText) {
            textContent.tertiaryText = {
                type: 'RichText',
                text: this.tertiaryText,
            };
        }
        return textContent;
    }
}
exports.RichTextContentHelper = RichTextContentHelper;
//# sourceMappingURL=RichTextContentHelper.js.map

/***/ }),

/***/ 835:
/***/ ((__unused_webpack_module, exports) => {


/*
 * Copyright 2018 Amazon.com, Inc. or its affiliates. All Rights Reserved.
 * Licensed under the Apache License, Version 2.0 (the "License").
 * You may not use this file except in compliance with the License.
 * A copy of the License is located at
 *      http://www.apache.org/licenses/LICENSE-2.0
 *
 * or in the "license" file accompanying this file. This file is distributed
 * on an "AS IS" BASIS, WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either
 * express or implied. See the License for the specific language governing
 * permissions and limitations under the License.
 */
Object.defineProperty(exports, "__esModule", ({ value: true }));
exports.ResponseFactory = void 0;
/**
 * Responsible for building JSON responses using ask-sdk-model as per the Alexa skills kit interface
 * https://developer.amazon.com/public/solutions/alexa/alexa-skills-kit/docs/alexa-skills-kit-interface-reference#response-body-syntax.
 */
class ResponseFactory {
    static init() {
        const response = {};
        function isVideoAppLaunchDirectivePresent() {
            if (!response.directives) {
                return false;
            }
            for (const directive of response.directives) {
                if (directive.type === 'VideoApp.Launch') {
                    return true;
                }
            }
            return false;
        }
        function trimOutputSpeech(speechOutput) {
            if (!speechOutput) {
                return '';
            }
            const speech = speechOutput.trim();
            const length = speech.length;
            if (speech.startsWith('<speak>') && speech.endsWith('</speak>')) {
                return speech.substring(7, length - 8).trim();
            }
            return speech;
        }
        return {
            speak(speechOutput, playBehavior) {
                response.outputSpeech = {
                    type: 'SSML',
                    ssml: `<speak>${trimOutputSpeech(speechOutput)}</speak>`,
                    playBehavior,
                };
                if (!playBehavior) {
                    delete response.outputSpeech.playBehavior;
                }
                return this;
            },
            reprompt(repromptSpeechOutput, playBehavior) {
                if (!response.reprompt) {
                    response.reprompt = {};
                }
                response.reprompt.outputSpeech = {
                    type: 'SSML',
                    ssml: `<speak>${trimOutputSpeech(repromptSpeechOutput)}</speak>`,
                    playBehavior,
                };
                if (!playBehavior) {
                    delete response.reprompt.outputSpeech.playBehavior;
                }
                if (!isVideoAppLaunchDirectivePresent()) {
                    response.shouldEndSession = false;
                }
                return this;
            },
            withSimpleCard(cardTitle, cardContent) {
                response.card = {
                    type: 'Simple',
                    title: cardTitle,
                    content: cardContent,
                };
                return this;
            },
            withStandardCard(cardTitle, cardContent, smallImageUrl, largeImageUrl) {
                const card = {
                    type: 'Standard',
                    title: cardTitle,
                    text: cardContent,
                };
                if (smallImageUrl || largeImageUrl) {
                    card.image = {};
                    if (smallImageUrl) {
                        card.image.smallImageUrl = smallImageUrl;
                    }
                    if (largeImageUrl) {
                        card.image.largeImageUrl = largeImageUrl;
                    }
                }
                response.card = card;
                return this;
            },
            withLinkAccountCard() {
                response.card = {
                    type: 'LinkAccount',
                };
                return this;
            },
            withAskForPermissionsConsentCard(permissionArray) {
                response.card = {
                    type: 'AskForPermissionsConsent',
                    permissions: permissionArray,
                };
                return this;
            },
            addDelegateDirective(updatedIntent) {
                const delegateDirective = {
                    type: 'Dialog.Delegate',
                };
                if (updatedIntent) {
                    delegateDirective.updatedIntent = updatedIntent;
                }
                this.addDirective(delegateDirective);
                return this;
            },
            addElicitSlotDirective(slotToElicit, updatedIntent) {
                const elicitSlotDirective = {
                    type: 'Dialog.ElicitSlot',
                    slotToElicit,
                };
                if (updatedIntent) {
                    elicitSlotDirective.updatedIntent = updatedIntent;
                }
                this.addDirective(elicitSlotDirective);
                return this;
            },
            addConfirmSlotDirective(slotToConfirm, updatedIntent) {
                const confirmSlotDirective = {
                    type: 'Dialog.ConfirmSlot',
                    slotToConfirm,
                };
                if (updatedIntent) {
                    confirmSlotDirective.updatedIntent = updatedIntent;
                }
                this.addDirective(confirmSlotDirective);
                return this;
            },
            addConfirmIntentDirective(updatedIntent) {
                const confirmIntentDirective = {
                    type: 'Dialog.ConfirmIntent',
                };
                if (updatedIntent) {
                    confirmIntentDirective.updatedIntent = updatedIntent;
                }
                this.addDirective(confirmIntentDirective);
                return this;
            },
            addAudioPlayerPlayDirective(playBehavior, url, token, offsetInMilliseconds, expectedPreviousToken, audioItemMetadata) {
                const stream = {
                    url,
                    token,
                    offsetInMilliseconds,
                };
                if (expectedPreviousToken) {
                    stream.expectedPreviousToken = expectedPreviousToken;
                }
                const audioItem = {
                    stream,
                };
                if (audioItemMetadata) {
                    audioItem.metadata = audioItemMetadata;
                }
                const playDirective = {
                    type: 'AudioPlayer.Play',
                    playBehavior,
                    audioItem,
                };
                this.addDirective(playDirective);
                return this;
            },
            addAudioPlayerStopDirective() {
                const stopDirective = {
                    type: 'AudioPlayer.Stop',
                };
                this.addDirective(stopDirective);
                return this;
            },
            addAudioPlayerClearQueueDirective(clearBehavior) {
                const clearQueueDirective = {
                    type: 'AudioPlayer.ClearQueue',
                    clearBehavior,
                };
                this.addDirective(clearQueueDirective);
                return this;
            },
            addRenderTemplateDirective(template) {
                const renderTemplateDirective = {
                    type: 'Display.RenderTemplate',
                    template,
                };
                this.addDirective(renderTemplateDirective);
                return this;
            },
            addHintDirective(text) {
                const hint = {
                    type: 'PlainText',
                    text,
                };
                const hintDirective = {
                    type: 'Hint',
                    hint,
                };
                this.addDirective(hintDirective);
                return this;
            },
            addVideoAppLaunchDirective(source, title, subtitle) {
                const videoItem = {
                    source,
                };
                if (title || subtitle) {
                    videoItem.metadata = {};
                    if (title) {
                        videoItem.metadata.title = title;
                    }
                    if (subtitle) {
                        videoItem.metadata.subtitle = subtitle;
                    }
                }
                const launchDirective = {
                    type: 'VideoApp.Launch',
                    videoItem,
                };
                this.addDirective(launchDirective);
                delete response.shouldEndSession;
                return this;
            },
            withCanFulfillIntent(canFulfillIntent) {
                response.canFulfillIntent = canFulfillIntent;
                return this;
            },
            withShouldEndSession(val) {
                if (!isVideoAppLaunchDirectivePresent()) {
                    response.shouldEndSession = val;
                }
                return this;
            },
            addDirective(directive) {
                if (!response.directives) {
                    response.directives = [];
                }
                response.directives.push(directive);
                return this;
            },
            addDirectiveToReprompt(directive) {
                if (!response.reprompt) {
                    response.reprompt = {};
                }
                if (!response.reprompt.directives) {
                    response.reprompt.directives = [];
                }
                response.reprompt.directives.push(directive);
                if (!isVideoAppLaunchDirectivePresent()) {
                    this.withShouldEndSession(false);
                }
                return this;
            },
            withApiResponse(apiResponse) {
                response.apiResponse = apiResponse;
                return this;
            },
            addExperimentTrigger(experimentId) {
                if (!response.experimentation) {
                    const experimentation = {
                        triggeredExperiments: []
                    };
                    response.experimentation = experimentation;
                }
                response.experimentation.triggeredExperiments.push(experimentId);
                return this;
            },
            getResponse() {
                return response;
            },
        };
    }
    constructor() { }
}
exports.ResponseFactory = ResponseFactory;
//# sourceMappingURL=ResponseFactory.js.map

/***/ }),

/***/ 844:
/***/ ((__unused_webpack_module, exports, __webpack_require__) => {


/*
 * Copyright 2018 Amazon.com, Inc. or its affiliates. All Rights Reserved.
 * Licensed under the Apache License, Version 2.0 (the "License").
 * You may not use this file except in compliance with the License.
 * A copy of the License is located at
 *      http://www.apache.org/licenses/LICENSE-2.0
 *
 * or in the "license" file accompanying this file. This file is distributed
 * on an "AS IS" BASIS, WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either
 * express or implied. See the License for the specific language governing
 * permissions and limitations under the License.
 */
Object.defineProperty(exports, "__esModule", ({ value: true }));
exports.DefaultApiClient = void 0;
const ask_sdk_runtime_1 = __webpack_require__(995);
const url = __webpack_require__(16);
/**
 * Default implementation of {@link services.ApiClient} which uses the native HTTP/HTTPS library of Node.JS.
 */
class DefaultApiClient {
    /**
     * Dispatches a request to an API endpoint described in the request.
     * An ApiClient is expected to resolve the Promise in the case an API returns a non-200 HTTP
     * status code. The responsibility of translating a particular response code to an error lies with the
     * caller to invoke.
     * @param {services.ApiClientRequest} request request to dispatch to the ApiClient
     * @returns {Promise<services.ApiClientResponse>} response from the ApiClient
     */
    invoke(request) {
        const urlObj = url.parse(request.url);
        const clientRequestOptions = {
            // tslint:disable:object-literal-sort-keys
            hostname: urlObj.hostname,
            path: urlObj.path,
            port: urlObj.port,
            protocol: urlObj.protocol,
            auth: urlObj.auth,
            headers: arrayToObjectHeader(request.headers),
            method: request.method,
        };
        const client = clientRequestOptions.protocol === 'https:' ? __webpack_require__(692) : __webpack_require__(611);
        return new Promise((resolve, reject) => {
            const clientRequest = client.request(clientRequestOptions, (response) => {
                const chunks = [];
                response.on('data', (chunk) => {
                    chunks.push(chunk);
                });
                response.on('end', () => {
                    const responseStr = chunks.join('');
                    const responseObj = {
                        statusCode: response.statusCode,
                        body: responseStr,
                        headers: objectToArrayHeader(response.headers),
                    };
                    resolve(responseObj);
                });
            });
            clientRequest.on('error', (err) => {
                reject((0, ask_sdk_runtime_1.createAskSdkError)(this.constructor.name, err.message));
            });
            if (request.body) {
                clientRequest.write(request.body);
            }
            clientRequest.end();
        });
    }
}
exports.DefaultApiClient = DefaultApiClient;
/**
 * Converts the header array in {@link services.ApiClientRequest} to compatible JSON object.
 * @private
 * @param {{key : string, value : string}[]} header header array from ApiClientRequest}
 * @returns {Object.<string, string[]>} header object to pass into HTTP client
 */
function arrayToObjectHeader(header) {
    const reducer = (obj, item) => {
        if (obj[item.key]) {
            obj[item.key].push(item.value);
        }
        else {
            obj[item.key] = [item.value];
        }
        return obj;
    };
    return header.reduce(reducer, {});
}
/**
 * Converts JSON header object to header array required for {services.ApiClientResponse}
 * @private
 * @param {Object.<string, (string|string[])>} header JSON header object returned by HTTP client
 * @returns {{key : string, value : string}[]}
 */
function objectToArrayHeader(header) {
    const arrayHeader = [];
    Object.keys(header).forEach((key) => {
        const headerArray = Array.isArray(header[key]) ? header[key] : [header[key]];
        for (const value of headerArray) {
            arrayHeader.push({
                key,
                value,
            });
        }
    });
    return arrayHeader;
}
//# sourceMappingURL=DefaultApiClient.js.map

/***/ }),

/***/ 874:
/***/ ((__unused_webpack_module, exports) => {


/*
 * Copyright 2018 Amazon.com, Inc. or its affiliates. All Rights Reserved.
 * Licensed under the Apache License, Version 2.0 (the "License").
 * You may not use this file except in compliance with the License.
 * A copy of the License is located at
 *      http://www.apache.org/licenses/LICENSE-2.0
 *
 * or in the "license" file accompanying this file. This file is distributed
 * on an "AS IS" BASIS, WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either
 * express or implied. See the License for the specific language governing
 * permissions and limitations under the License.
 */
Object.defineProperty(exports, "__esModule", ({ value: true }));
exports.GenericErrorMapper = void 0;
/**
 * Generic implementation of @{link ErrorMapper}
 */
class GenericErrorMapper {
    constructor(options) {
        this.errorHandlers = options.errorHandlers;
    }
    async getErrorHandler(handlerInput, error) {
        for (const errorHandler of this.errorHandlers) {
            if (await errorHandler.canHandle(handlerInput, error)) {
                return errorHandler;
            }
        }
        return null;
    }
}
exports.GenericErrorMapper = GenericErrorMapper;
//# sourceMappingURL=GenericErrorMapper.js.map

/***/ }),

/***/ 882:
/***/ ((__unused_webpack_module, exports, __webpack_require__) => {


/*
 * Copyright 2018 Amazon.com, Inc. or its affiliates. All Rights Reserved.
 * Licensed under the Apache License, Version 2.0 (the "License").
 * You may not use this file except in compliance with the License.
 * A copy of the License is located at
 *      http://www.apache.org/licenses/LICENSE-2.0
 *
 * or in the "license" file accompanying this file. This file is distributed
 * on an "AS IS" BASIS, WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either
 * express or implied. See the License for the specific language governing
 * permissions and limitations under the License.
 */
Object.defineProperty(exports, "__esModule", ({ value: true }));
exports.PlainTextContentHelper = void 0;
const TextContentHelper_1 = __webpack_require__(36);
/**
 * Responsible for building plain text content object using ask-sdk-model in Alexa skills kit display interface
 * https://developer.amazon.com/docs/custom-skills/display-interface-reference.html#textcontent-object-specifications.
 */
class PlainTextContentHelper extends TextContentHelper_1.TextContentHelper {
    constructor() {
        super();
    }
    /**
     * @returns {interfaces.display.TextContent}
     */
    getTextContent() {
        const textContent = {};
        if (this.primaryText) {
            textContent.primaryText = {
                type: 'PlainText',
                text: this.primaryText,
            };
        }
        if (this.secondaryText) {
            textContent.secondaryText = {
                type: 'PlainText',
                text: this.secondaryText,
            };
        }
        if (this.tertiaryText) {
            textContent.tertiaryText = {
                type: 'PlainText',
                text: this.tertiaryText,
            };
        }
        return textContent;
    }
}
exports.PlainTextContentHelper = PlainTextContentHelper;
//# sourceMappingURL=PlainTextContentHelper.js.map

/***/ }),

/***/ 976:
/***/ ((__unused_webpack_module, exports) => {

/*
 * Copyright 2018 Amazon.com, Inc. or its affiliates. All Rights Reserved.
 * Licensed under the Apache License, Version 2.0 (the "License").
 * You may not use this file except in compliance with the License.
 * A copy of the License is located at
 *      http://www.apache.org/licenses/LICENSE-2.0
 *
 * or in the "license" file accompanying this file. This file is distributed
 * on an "AS IS" BASIS, WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either
 * express or implied. See the License for the specific language governing
 * permissions and limitations under the License.
 */

Object.defineProperty(exports, "__esModule", ({ value: true }));
exports.createAskSdkUserAgent = exports.createAskSdkError = void 0;
/**
 * function creating an AskSdk error.
 * @param {string} errorScope
 * @param {string} errorMessage
 * @returns {Error}
 */
function createAskSdkError(errorScope, errorMessage) {
    const error = new Error(errorMessage);
    error.name = `AskSdk.${errorScope} Error`;
    return error;
}
exports.createAskSdkError = createAskSdkError;
/**
 * function creating an AskSdk user agent.
 * @param packageVersion
 * @param customUserAgent
 */
function createAskSdkUserAgent(packageVersion, customUserAgent) {
    const customUserAgentString = customUserAgent ? (` ${customUserAgent}`) : '';
    return `ask-node/${packageVersion} Node/${process.version}${customUserAgentString}`;
}
exports.createAskSdkUserAgent = createAskSdkUserAgent;
//# sourceMappingURL=AskSdkUtils.js.map

/***/ }),

/***/ 989:
/***/ ((__unused_webpack_module, exports) => {


/*
 * Copyright 2018 Amazon.com, Inc. or its affiliates. All Rights Reserved.
 * Licensed under the Apache License, Version 2.0 (the "License").
 * You may not use this file except in compliance with the License.
 * A copy of the License is located at
 *      http://www.apache.org/licenses/LICENSE-2.0
 *
 * or in the "license" file accompanying this file. This file is distributed
 * on an "AS IS" BASIS, WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either
 * express or implied. See the License for the specific language governing
 * permissions and limitations under the License.
 */
Object.defineProperty(exports, "__esModule", ({ value: true }));
exports.GenericRequestHandlerChain = void 0;
/**
 * Generic implementation of {@link RequestHandlerChain}.
 */
class GenericRequestHandlerChain {
    constructor(options) {
        this.requestHandler = options.requestHandler;
        this.requestInterceptors = options.requestInterceptors;
        this.responseInterceptors = options.responseInterceptors;
    }
    getRequestHandler() {
        return this.requestHandler;
    }
    getRequestInterceptors() {
        return this.requestInterceptors;
    }
    getResponseInterceptors() {
        return this.responseInterceptors;
    }
}
exports.GenericRequestHandlerChain = GenericRequestHandlerChain;
//# sourceMappingURL=GenericRequestHandlerChain.js.map

/***/ }),

/***/ 995:
/***/ ((__unused_webpack_module, exports, __webpack_require__) => {


/*
 * Copyright 2018 Amazon.com, Inc. or its affiliates. All Rights Reserved.
 * Licensed under the Apache License, Version 2.0 (the "License").
 * You may not use this file except in compliance with the License.
 * A copy of the License is located at
 *      http://www.apache.org/licenses/LICENSE-2.0
 *
 * or in the "license" file accompanying this file. This file is distributed
 * on an "AS IS" BASIS, WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either
 * express or implied. See the License for the specific language governing
 * permissions and limitations under the License.
 */
Object.defineProperty(exports, "__esModule", ({ value: true }));
exports.UserAgentManager = exports.createAskSdkUserAgent = exports.createAskSdkError = exports.GenericRequestDispatcher = exports.RuntimeConfigurationBuilder = exports.GenericRequestMapper = exports.GenericRequestHandlerChain = exports.GenericHandlerAdapter = exports.GenericErrorMapper = void 0;
var GenericErrorMapper_1 = __webpack_require__(874);
Object.defineProperty(exports, "GenericErrorMapper", ({ enumerable: true, get: function () { return GenericErrorMapper_1.GenericErrorMapper; } }));
var GenericHandlerAdapter_1 = __webpack_require__(266);
Object.defineProperty(exports, "GenericHandlerAdapter", ({ enumerable: true, get: function () { return GenericHandlerAdapter_1.GenericHandlerAdapter; } }));
var GenericRequestHandlerChain_1 = __webpack_require__(989);
Object.defineProperty(exports, "GenericRequestHandlerChain", ({ enumerable: true, get: function () { return GenericRequestHandlerChain_1.GenericRequestHandlerChain; } }));
var GenericRequestMapper_1 = __webpack_require__(138);
Object.defineProperty(exports, "GenericRequestMapper", ({ enumerable: true, get: function () { return GenericRequestMapper_1.GenericRequestMapper; } }));
var RuntimeConfigurationBuilder_1 = __webpack_require__(712);
Object.defineProperty(exports, "RuntimeConfigurationBuilder", ({ enumerable: true, get: function () { return RuntimeConfigurationBuilder_1.RuntimeConfigurationBuilder; } }));
var GenericRequestDispatcher_1 = __webpack_require__(414);
Object.defineProperty(exports, "GenericRequestDispatcher", ({ enumerable: true, get: function () { return GenericRequestDispatcher_1.GenericRequestDispatcher; } }));
var AskSdkUtils_1 = __webpack_require__(976);
Object.defineProperty(exports, "createAskSdkError", ({ enumerable: true, get: function () { return AskSdkUtils_1.createAskSdkError; } }));
Object.defineProperty(exports, "createAskSdkUserAgent", ({ enumerable: true, get: function () { return AskSdkUtils_1.createAskSdkUserAgent; } }));
var UserAgentManager_1 = __webpack_require__(93);
Object.defineProperty(exports, "UserAgentManager", ({ enumerable: true, get: function () { return UserAgentManager_1.UserAgentManager; } }));
//# sourceMappingURL=index.js.map

/***/ })

/******/ 	});
/************************************************************************/
/******/ 	// The module cache
/******/ 	var __webpack_module_cache__ = {};
/******/ 	
/******/ 	// The require function
/******/ 	function __webpack_require__(moduleId) {
/******/ 		// Check if module is in cache
/******/ 		var cachedModule = __webpack_module_cache__[moduleId];
/******/ 		if (cachedModule !== undefined) {
/******/ 			return cachedModule.exports;
/******/ 		}
/******/ 		// Create a new module (and put it into the cache)
/******/ 		var module = __webpack_module_cache__[moduleId] = {
/******/ 			// no module.id needed
/******/ 			// no module.loaded needed
/******/ 			exports: {}
/******/ 		};
/******/ 	
/******/ 		// Execute the module function
/******/ 		__webpack_modules__[moduleId].call(module.exports, module, module.exports, __webpack_require__);
/******/ 	
/******/ 		// Return the exports of the module
/******/ 		return module.exports;
/******/ 	}
/******/ 	
/************************************************************************/
var __webpack_exports__ = {};
// This entry needs to be wrapped in an IIFE because it uses a non-standard name for the exports (exports).
(() => {
var exports = __webpack_exports__;

Object.defineProperty(exports, "__esModule", ({ value: true }));
exports.handler = void 0;
const ask_sdk_core_1 = __webpack_require__(294);
/**
 * Main Lambda handler for Alexa LLM Chat skill
 * This will be implemented in later tasks with actual intent handlers
 */
exports.handler = ask_sdk_core_1.SkillBuilders.custom()
    .addRequestHandlers(
// Intent handlers will be added in subsequent tasks
)
    .addErrorHandlers(
// Error handlers will be added in subsequent tasks
)
    .lambda();

})();

module.exports = __webpack_exports__;
/******/ })()
;