"use strict";
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
    function adopt(value) { return value instanceof P ? value : new P(function (resolve) { resolve(value); }); }
    return new (P || (P = Promise))(function (resolve, reject) {
        function fulfilled(value) { try { step(generator.next(value)); } catch (e) { reject(e); } }
        function rejected(value) { try { step(generator["throw"](value)); } catch (e) { reject(e); } }
        function step(result) { result.done ? resolve(result.value) : adopt(result.value).then(fulfilled, rejected); }
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
Object.defineProperty(exports, "__esModule", { value: true });
var bytes_1 = require("@ethersproject/bytes");
var properties_1 = require("@ethersproject/properties");
var web_1 = require("@ethersproject/web");
var formatter_1 = require("./formatter");
var logger_1 = require("@ethersproject/logger");
var _version_1 = require("./_version");
var logger = new logger_1.Logger(_version_1.version);
var base_provider_1 = require("./base-provider");
// The transaction has already been sanitized by the calls in Provider
function getTransactionString(transaction) {
    var result = [];
    for (var key in transaction) {
        if (transaction[key] == null) {
            continue;
        }
        var value = bytes_1.hexlify(transaction[key]);
        if ({ gasLimit: true, gasPrice: true, nonce: true, value: true }[key]) {
            value = bytes_1.hexValue(value);
        }
        result.push(key + "=" + value);
    }
    return result.join("&");
}
function getResult(result) {
    // getLogs, getHistory have weird success responses
    if (result.status == 0 && (result.message === "No records found" || result.message === "No transactions found")) {
        return result.result;
    }
    if (result.status != 1 || result.message != "OK") {
        var error = new Error("invalid response");
        error.result = JSON.stringify(result);
        if ((result.result || "").toLowerCase().indexOf("rate limit") >= 0) {
            error.throttleRetry = true;
        }
        throw error;
    }
    return result.result;
}
function getJsonResult(result) {
    // This response indicates we are being throttled
    if (result && result.status == 0 && result.message == "NOTOK" && (result.result || "").toLowerCase().indexOf("rate limit") >= 0) {
        var error = new Error("throttled response");
        error.result = JSON.stringify(result);
        error.throttleRetry = true;
        throw error;
    }
    if (result.jsonrpc != "2.0") {
        // @TODO: not any
        var error = new Error("invalid response");
        error.result = JSON.stringify(result);
        throw error;
    }
    if (result.error) {
        // @TODO: not any
        var error = new Error(result.error.message || "unknown error");
        if (result.error.code) {
            error.code = result.error.code;
        }
        if (result.error.data) {
            error.data = result.error.data;
        }
        throw error;
    }
    return result.result;
}
// The blockTag was normalized as a string by the Provider pre-perform operations
function checkLogTag(blockTag) {
    if (blockTag === "pending") {
        throw new Error("pending not supported");
    }
    if (blockTag === "latest") {
        return blockTag;
    }
    return parseInt(blockTag.substring(2), 16);
}
var defaultApiKey = "9D13ZE7XSBTJ94N9BNJ2MA33VMAY2YPIRB";
var EtherscanProvider = /** @class */ (function (_super) {
    __extends(EtherscanProvider, _super);
    function EtherscanProvider(network, apiKey) {
        var _newTarget = this.constructor;
        var _this = this;
        logger.checkNew(_newTarget, EtherscanProvider);
        _this = _super.call(this, network) || this;
        var name = "invalid";
        if (_this.network) {
            name = _this.network.name;
        }
        var baseUrl = null;
        switch (name) {
            case "homestead":
                baseUrl = "https://api.etherscan.io";
                break;
            case "ropsten":
                baseUrl = "https://api-ropsten.etherscan.io";
                break;
            case "rinkeby":
                baseUrl = "https://api-rinkeby.etherscan.io";
                break;
            case "kovan":
                baseUrl = "https://api-kovan.etherscan.io";
                break;
            case "goerli":
                baseUrl = "https://api-goerli.etherscan.io";
                break;
            default:
                throw new Error("unsupported network");
        }
        properties_1.defineReadOnly(_this, "baseUrl", baseUrl);
        properties_1.defineReadOnly(_this, "apiKey", apiKey || defaultApiKey);
        return _this;
    }
    EtherscanProvider.prototype.detectNetwork = function () {
        return __awaiter(this, void 0, void 0, function () {
            return __generator(this, function (_a) {
                return [2 /*return*/, this.network];
            });
        });
    };
    EtherscanProvider.prototype.perform = function (method, params) {
        return __awaiter(this, void 0, void 0, function () {
            var url, apiKey, get, _a, transaction, transaction, topic0, logs, txs, i, log, tx, _b;
            var _this = this;
            return __generator(this, function (_c) {
                switch (_c.label) {
                    case 0:
                        url = this.baseUrl;
                        apiKey = "";
                        if (this.apiKey) {
                            apiKey += "&apikey=" + this.apiKey;
                        }
                        get = function (url, procFunc) { return __awaiter(_this, void 0, void 0, function () {
                            var connection, result;
                            var _this = this;
                            return __generator(this, function (_a) {
                                switch (_a.label) {
                                    case 0:
                                        this.emit("debug", {
                                            action: "request",
                                            request: url,
                                            provider: this
                                        });
                                        connection = {
                                            url: url,
                                            throttleCallback: function (attempt, url) {
                                                if (_this.apiKey === defaultApiKey) {
                                                    formatter_1.showThrottleMessage();
                                                }
                                                return Promise.resolve(true);
                                            }
                                        };
                                        return [4 /*yield*/, web_1.fetchJson(connection, null, procFunc || getJsonResult)];
                                    case 1:
                                        result = _a.sent();
                                        this.emit("debug", {
                                            action: "response",
                                            request: url,
                                            response: properties_1.deepCopy(result),
                                            provider: this
                                        });
                                        return [2 /*return*/, result];
                                }
                            });
                        }); };
                        _a = method;
                        switch (_a) {
                            case "getBlockNumber": return [3 /*break*/, 1];
                            case "getGasPrice": return [3 /*break*/, 2];
                            case "getBalance": return [3 /*break*/, 3];
                            case "getTransactionCount": return [3 /*break*/, 4];
                            case "getCode": return [3 /*break*/, 5];
                            case "getStorageAt": return [3 /*break*/, 6];
                            case "sendTransaction": return [3 /*break*/, 7];
                            case "getBlock": return [3 /*break*/, 8];
                            case "getTransaction": return [3 /*break*/, 9];
                            case "getTransactionReceipt": return [3 /*break*/, 10];
                            case "call": return [3 /*break*/, 11];
                            case "estimateGas": return [3 /*break*/, 12];
                            case "getLogs": return [3 /*break*/, 13];
                            case "getEtherPrice": return [3 /*break*/, 20];
                        }
                        return [3 /*break*/, 22];
                    case 1:
                        url += "/api?module=proxy&action=eth_blockNumber" + apiKey;
                        return [2 /*return*/, get(url)];
                    case 2:
                        url += "/api?module=proxy&action=eth_gasPrice" + apiKey;
                        return [2 /*return*/, get(url)];
                    case 3:
                        // Returns base-10 result
                        url += "/api?module=account&action=balance&address=" + params.address;
                        url += "&tag=" + params.blockTag + apiKey;
                        return [2 /*return*/, get(url, getResult)];
                    case 4:
                        url += "/api?module=proxy&action=eth_getTransactionCount&address=" + params.address;
                        url += "&tag=" + params.blockTag + apiKey;
                        return [2 /*return*/, get(url)];
                    case 5:
                        url += "/api?module=proxy&action=eth_getCode&address=" + params.address;
                        url += "&tag=" + params.blockTag + apiKey;
                        return [2 /*return*/, get(url)];
                    case 6:
                        url += "/api?module=proxy&action=eth_getStorageAt&address=" + params.address;
                        url += "&position=" + params.position;
                        url += "&tag=" + params.blockTag + apiKey;
                        return [2 /*return*/, get(url)];
                    case 7:
                        url += "/api?module=proxy&action=eth_sendRawTransaction&hex=" + params.signedTransaction;
                        url += apiKey;
                        return [2 /*return*/, get(url).catch(function (error) {
                                if (error.responseText) {
                                    // "Insufficient funds. The account you tried to send transaction from does not have enough funds. Required 21464000000000 and got: 0"
                                    if (error.responseText.toLowerCase().indexOf("insufficient funds") >= 0) {
                                        logger.throwError("insufficient funds", logger_1.Logger.errors.INSUFFICIENT_FUNDS, {});
                                    }
                                    // "Transaction with the same hash was already imported."
                                    if (error.responseText.indexOf("same hash was already imported") >= 0) {
                                        logger.throwError("nonce has already been used", logger_1.Logger.errors.NONCE_EXPIRED, {});
                                    }
                                    // "Transaction gas price is too low. There is another transaction with same nonce in the queue. Try increasing the gas price or incrementing the nonce."
                                    if (error.responseText.indexOf("another transaction with same nonce") >= 0) {
                                        logger.throwError("replacement fee too low", logger_1.Logger.errors.REPLACEMENT_UNDERPRICED, {});
                                    }
                                }
                                throw error;
                            })];
                    case 8:
                        if (params.blockTag) {
                            url += "/api?module=proxy&action=eth_getBlockByNumber&tag=" + params.blockTag;
                            if (params.includeTransactions) {
                                url += "&boolean=true";
                            }
                            else {
                                url += "&boolean=false";
                            }
                            url += apiKey;
                            return [2 /*return*/, get(url)];
                        }
                        throw new Error("getBlock by blockHash not implemented");
                    case 9:
                        url += "/api?module=proxy&action=eth_getTransactionByHash&txhash=" + params.transactionHash;
                        url += apiKey;
                        return [2 /*return*/, get(url)];
                    case 10:
                        url += "/api?module=proxy&action=eth_getTransactionReceipt&txhash=" + params.transactionHash;
                        url += apiKey;
                        return [2 /*return*/, get(url)];
                    case 11:
                        {
                            transaction = getTransactionString(params.transaction);
                            if (transaction) {
                                transaction = "&" + transaction;
                            }
                            url += "/api?module=proxy&action=eth_call" + transaction;
                            //url += "&tag=" + params.blockTag + apiKey;
                            if (params.blockTag !== "latest") {
                                throw new Error("EtherscanProvider does not support blockTag for call");
                            }
                            url += apiKey;
                            return [2 /*return*/, get(url)];
                        }
                        _c.label = 12;
                    case 12:
                        {
                            transaction = getTransactionString(params.transaction);
                            if (transaction) {
                                transaction = "&" + transaction;
                            }
                            url += "/api?module=proxy&action=eth_estimateGas&" + transaction;
                            url += apiKey;
                            return [2 /*return*/, get(url)];
                        }
                        _c.label = 13;
                    case 13:
                        url += "/api?module=logs&action=getLogs";
                        if (params.filter.fromBlock) {
                            url += "&fromBlock=" + checkLogTag(params.filter.fromBlock);
                        }
                        if (params.filter.toBlock) {
                            url += "&toBlock=" + checkLogTag(params.filter.toBlock);
                        }
                        if (params.filter.address) {
                            url += "&address=" + params.filter.address;
                        }
                        // @TODO: We can handle slightly more complicated logs using the logs API
                        if (params.filter.topics && params.filter.topics.length > 0) {
                            if (params.filter.topics.length > 1) {
                                logger.throwError("unsupported topic count", logger_1.Logger.errors.UNSUPPORTED_OPERATION, { topics: params.filter.topics });
                            }
                            if (params.filter.topics.length === 1) {
                                topic0 = params.filter.topics[0];
                                if (typeof (topic0) !== "string" || topic0.length !== 66) {
                                    logger.throwError("unsupported topic format", logger_1.Logger.errors.UNSUPPORTED_OPERATION, { topic0: topic0 });
                                }
                                url += "&topic0=" + topic0;
                            }
                        }
                        url += apiKey;
                        return [4 /*yield*/, get(url, getResult)];
                    case 14:
                        logs = _c.sent();
                        txs = {};
                        i = 0;
                        _c.label = 15;
                    case 15:
                        if (!(i < logs.length)) return [3 /*break*/, 19];
                        log = logs[i];
                        if (log.blockHash != null) {
                            return [3 /*break*/, 18];
                        }
                        if (!(txs[log.transactionHash] == null)) return [3 /*break*/, 17];
                        return [4 /*yield*/, this.getTransaction(log.transactionHash)];
                    case 16:
                        tx = _c.sent();
                        if (tx) {
                            txs[log.transactionHash] = tx.blockHash;
                        }
                        _c.label = 17;
                    case 17:
                        log.blockHash = txs[log.transactionHash];
                        _c.label = 18;
                    case 18:
                        i++;
                        return [3 /*break*/, 15];
                    case 19: return [2 /*return*/, logs];
                    case 20:
                        if (this.network.name !== "homestead") {
                            return [2 /*return*/, 0.0];
                        }
                        url += "/api?module=stats&action=ethprice";
                        url += apiKey;
                        _b = parseFloat;
                        return [4 /*yield*/, get(url, getResult)];
                    case 21: return [2 /*return*/, _b.apply(void 0, [(_c.sent()).ethusd])];
                    case 22: return [3 /*break*/, 23];
                    case 23: return [2 /*return*/, _super.prototype.perform.call(this, method, params)];
                }
            });
        });
    };
    // @TODO: Allow startBlock and endBlock to be Promises
    EtherscanProvider.prototype.getHistory = function (addressOrName, startBlock, endBlock) {
        var _this = this;
        var url = this.baseUrl;
        var apiKey = "";
        if (this.apiKey) {
            apiKey += "&apikey=" + this.apiKey;
        }
        if (startBlock == null) {
            startBlock = 0;
        }
        if (endBlock == null) {
            endBlock = 99999999;
        }
        return this.resolveName(addressOrName).then(function (address) {
            url += "/api?module=account&action=txlist&address=" + address;
            url += "&startblock=" + startBlock;
            url += "&endblock=" + endBlock;
            url += "&sort=asc" + apiKey;
            _this.emit("debug", {
                action: "request",
                request: url,
                provider: _this
            });
            var connection = {
                url: url,
                throttleCallback: function (attempt, url) {
                    if (_this.apiKey === defaultApiKey) {
                        formatter_1.showThrottleMessage();
                    }
                    return Promise.resolve(true);
                }
            };
            return web_1.fetchJson(connection, null, getResult).then(function (result) {
                _this.emit("debug", {
                    action: "response",
                    request: url,
                    response: properties_1.deepCopy(result),
                    provider: _this
                });
                var output = [];
                result.forEach(function (tx) {
                    ["contractAddress", "to"].forEach(function (key) {
                        if (tx[key] == "") {
                            delete tx[key];
                        }
                    });
                    if (tx.creates == null && tx.contractAddress != null) {
                        tx.creates = tx.contractAddress;
                    }
                    var item = _this.formatter.transactionResponse(tx);
                    if (tx.timeStamp) {
                        item.timestamp = parseInt(tx.timeStamp);
                    }
                    output.push(item);
                });
                return output;
            });
        });
    };
    return EtherscanProvider;
}(base_provider_1.BaseProvider));
exports.EtherscanProvider = EtherscanProvider;
//# sourceMappingURL=etherscan-provider.js.map