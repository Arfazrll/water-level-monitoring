"use strict";
var __createBinding = (this && this.__createBinding) || (Object.create ? (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    var desc = Object.getOwnPropertyDescriptor(m, k);
    if (!desc || ("get" in desc ? !m.__esModule : desc.writable || desc.configurable)) {
      desc = { enumerable: true, get: function() { return m[k]; } };
    }
    Object.defineProperty(o, k2, desc);
}) : (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    o[k2] = m[k];
}));
var __setModuleDefault = (this && this.__setModuleDefault) || (Object.create ? (function(o, v) {
    Object.defineProperty(o, "default", { enumerable: true, value: v });
}) : function(o, v) {
    o["default"] = v;
});
var __importStar = (this && this.__importStar) || (function () {
    var ownKeys = function(o) {
        ownKeys = Object.getOwnPropertyNames || function (o) {
            var ar = [];
            for (var k in o) if (Object.prototype.hasOwnProperty.call(o, k)) ar[ar.length] = k;
            return ar;
        };
        return ownKeys(o);
    };
    return function (mod) {
        if (mod && mod.__esModule) return mod;
        var result = {};
        if (mod != null) for (var k = ownKeys(mod), i = 0; i < k.length; i++) if (k[i] !== "default") __createBinding(result, mod, k[i]);
        __setModuleDefault(result, mod);
        return result;
    };
})();
var __awaiter = (this && this.__awaiter) || function (thisArg, _arguments, P, generator) {
    function adopt(value) { return value instanceof P ? value : new P(function (resolve) { resolve(value); }); }
    return new (P || (P = Promise))(function (resolve, reject) {
        function fulfilled(value) { try { step(generator.next(value)); } catch (e) { reject(e); } }
        function rejected(value) { try { step(generator["throw"](value)); } catch (e) { reject(e); } }
        function step(result) { result.done ? resolve(result.value) : adopt(result.value).then(fulfilled, rejected); }
        step((generator = generator.apply(thisArg, _arguments || [])).next());
    });
};
Object.defineProperty(exports, "__esModule", { value: true });
const mongoose_1 = __importStar(require("mongoose"));
const SettingsSchema = new mongoose_1.Schema({
    thresholds: {
        warningLevel: {
            type: Number,
            required: true,
            default: 70,
        },
        dangerLevel: {
            type: Number,
            required: true,
            default: 90,
        },
        maxLevel: {
            type: Number,
            required: true,
            default: 100,
        },
        minLevel: {
            type: Number,
            required: true,
            default: 0,
        },
        pumpActivationLevel: {
            type: Number,
            required: true,
            default: 80,
        },
        pumpDeactivationLevel: {
            type: Number,
            required: true,
            default: 40,
        },
        unit: {
            type: String,
            required: true,
            default: 'cm',
        },
    },
    notifications: {
        emailEnabled: {
            type: Boolean,
            default: false,
        },
        emailAddress: {
            type: String,
            default: '',
        },
        notifyOnWarning: {
            type: Boolean,
            default: true,
        },
        notifyOnDanger: {
            type: Boolean,
            default: true,
        },
        notifyOnPumpActivation: {
            type: Boolean,
            default: false,
        },
    },
    pumpMode: {
        type: String,
        enum: ['auto', 'manual'],
        default: 'auto',
    },
    lastUpdatedBy: {
        type: mongoose_1.Schema.Types.ObjectId,
        ref: 'User',
    },
}, {
    timestamps: true,
});
// Initialize with default settings if none exist
SettingsSchema.statics.getSettings = function () {
    return __awaiter(this, void 0, void 0, function* () {
        let settings = yield this.findOne();
        if (!settings) {
            settings = yield this.create({});
        }
        return settings;
    });
};
exports.default = mongoose_1.default.model('Settings', SettingsSchema);
//# sourceMappingURL=Setting.js.map