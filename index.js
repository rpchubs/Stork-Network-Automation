import AmazonCognitoIdentity from 'amazon-cognito-identity-js';
import axios from 'axios';
import fs from 'fs';
import path from 'path';
import { Worker, isMainThread, parentPort, workerData } from 'worker_threads';
import { HttpsProxyAgent } from 'https-proxy-agent';
import { SocksProxyAgent } from 'socks-proxy-agent';
import { accounts } from "./accounts.js";
import { fileURLToPath } from 'url';
import { createDashboard, updateStats, logMessage } from './dashboard.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

let screen, statsTable, logBox;

function maskEmail(email) {
    if (!email.includes('@')) return email;
    const [namePart, domain] = email.split('@');
    if (namePart.length <= 2) {
        return namePart[0] + '***@' + domain;
    } else {
        const visible = namePart.slice(0, 4);
        const masked = namePart.slice(4).replace(/./g, '*');
        return visible + masked + '@' + domain;
    }
}

function loadConfig() {
    try {
        const configPath = path.join(__dirname, 'config.json');
        if (!fs.existsSync(configPath)) {
            log(`Config file not located at ${configPath}, using default settings`, 'WARN');
            const defaultConfig = {
                cognito: {
                    region: 'ap-northeast-1',
                    clientId: '5msns4n49hmg3dftp2tp1t2iuh',
                    userPoolId: 'ap-northeast-1_M22I44OpC',
                    username: '',  // To be filled by user
                    password: ''   // To be filled by user
                },
                stork: {
                    intervalSeconds: 10
                },
                threads: {
                    maxWorkers: 10
                }
            };
            fs.writeFileSync(configPath, JSON.stringify(defaultConfig, null, 2), 'utf8');
            return defaultConfig;
        }

        const userConfig = JSON.parse(fs.readFileSync(configPath, 'utf8'));
        // log('Configuration loaded successfully from config.json');
        // log('Accounts loaded successfully from accounts.js');
        return userConfig;
    } catch (error) {
        log(`Error loading config: ${error.message}`, 'ERROR');
        throw new Error('Failed to load configuration');
    }
}

const userConfig = loadConfig();
const config = {
    cognito: {
        region: userConfig.cognito?.region || 'ap-northeast-1',
        clientId: userConfig.cognito?.clientId || '5msns4n49hmg3dftp2tp1t2iuh',
        userPoolId: userConfig.cognito?.userPoolId || 'ap-northeast-1_M22I44OpC',
        username: userConfig.cognito?.username || '',
        password: userConfig.cognito?.password || ''
    },
    stork: {
        baseURL: 'https://app-api.jp.stork-oracle.network/v1',
        authURL: 'https://api.jp.stork-oracle.network/auth',
        tokenPath: path.join(__dirname, 'tokens.json'),
        intervalSeconds: userConfig.stork?.intervalSeconds || 10,
        userAgent: 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/133.0.0.0 Safari/537.36',
        origin: 'chrome-extension://knnliglhgkmlblppdejchidfihjnockl'
    },
    threads: {
        maxWorkers: userConfig.threads?.maxWorkers || 10,
        proxyFile: path.join(__dirname, 'proxies.txt')
    }
};

function validateConfig() {
    if (!accounts[0].username || !accounts[0].password) {
        log('CRITICAL: No username or password in accounts.js', 'ERROR');
        log('Please update accounts.js with valid credentials:', 'INFO');
        log(JSON.stringify({
            username: "YOUR_EMAIL",
            password: "YOUR_PASSWORD"
        }, null, 2), 'INFO');
        return false;
    }
    return true;
}

const poolData = {
    UserPoolId: config.cognito.userPoolId,
    ClientId: config.cognito.clientId
};
const userPool = new AmazonCognitoIdentity.CognitoUserPool(poolData);

function getTimestamp() {
    const now = new Date();
    return now.toISOString().replace('T', ' ').substr(0, 19);
}
function getFormattedDate() {
    const now = new Date();
    return `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}-${String(now.getDate()).padStart(2, '0')} ${String(now.getHours()).padStart(2, '0')}:${String(now.getMinutes()).padStart(2, '0')}:${String(now.getSeconds()).padStart(2, '0')}`;
}

function log(message, type = 'INFO') {
    message = message.replace(/[\r\n]+/g, ' ');
    message = message.trim();
    const formatted = `[${getFormattedDate()}] [${type}] ${message}`;
    if (logBox) {
        logMessage(logBox, formatted);
    } else {
        console.log(formatted);
    }
}

function loadProxies() {
    try {
        if (!fs.existsSync(config.threads.proxyFile)) {
            log(`Proxy file absent at ${config.threads.proxyFile}, creating an empty file`, 'WARN');
            fs.writeFileSync(config.threads.proxyFile, '', 'utf8');
            return [];
        }
        const proxyData = fs.readFileSync(config.threads.proxyFile, 'utf8');
        const proxies = proxyData
            .split('\n')
            .map(line => line.trim())
            .filter(line => line && !line.startsWith('#'));
        // log(`Identified ${proxies.length} proxies from ${config.threads.proxyFile}`);
        return proxies;
    } catch (error) {
        log(`Failed to load proxies: ${error.message}`, 'ERROR');
        return [];
    }
}

function getProxyAgent(proxy) {
    if (!proxy) return null;
    if (proxy.startsWith('http')) return new HttpsProxyAgent(proxy);
    if (proxy.startsWith('socks4') || proxy.startsWith('socks5')) return new SocksProxyAgent(proxy);
    throw new Error(`Proxy protocol unsupported: ${proxy}`);
}

class CognitoAuth {
    constructor(username, password) {
        this.username = username;
        this.password = password;
        this.authenticationDetails = new AmazonCognitoIdentity.AuthenticationDetails({ Username: username, Password: password });
        this.cognitoUser = new AmazonCognitoIdentity.CognitoUser({ Username: username, Pool: userPool });
    }
    authenticate() {
        return new Promise((resolve, reject) => {
            this.cognitoUser.authenticateUser(this.authenticationDetails, {
                onSuccess: (result) => resolve({
                    accessToken: result.getAccessToken().getJwtToken(),
                    idToken: result.getIdToken().getJwtToken(),
                    refreshToken: result.getRefreshToken().getToken(),
                    expiresIn: result.getAccessToken().getExpiration() * 1000 - Date.now()
                }),
                onFailure: (err) => reject(err),
                newPasswordRequired: () => reject(new Error('New password required'))
            });
        });
    }
    refreshSession(refreshToken) {
        const refreshTokenObj = new AmazonCognitoIdentity.CognitoRefreshToken({ RefreshToken: refreshToken });
        return new Promise((resolve, reject) => {
            this.cognitoUser.refreshSession(refreshTokenObj, (err, result) => {
                if (err) reject(err);
                else resolve({
                    accessToken: result.getAccessToken().getJwtToken(),
                    idToken: result.getIdToken().getJwtToken(),
                    refreshToken: refreshToken,
                    expiresIn: result.getAccessToken().getExpiration() * 1000 - Date.now()
                });
            });
        });
    }
}

class TokenManager {
    constructor(i) {
        this.accessToken = null;
        this.refreshToken = null;
        this.idToken = null;
        this.expiresAt = null;
        this.auth = new CognitoAuth(accounts[i].username, accounts[i].password);
    }
    async getValidToken() {
        if (!this.accessToken || this.isTokenExpired()) {
            await this.refreshOrAuthenticate();
        }
        return this.accessToken;
    }
    isTokenExpired() {
        return Date.now() >= this.expiresAt;
    }
    async refreshOrAuthenticate() {
        try {
            let result = this.refreshToken
                ? await this.auth.refreshSession(this.refreshToken)
                : await this.auth.authenticate();
            await this.updateTokens(result);
        } catch (error) {
            log(`Failed to refresh/auth token: ${error.message}`, 'ERROR');
            throw error;
        }
    }
    async updateTokens(result) {
        log(`token expiresIn => ${result.expiresIn}`);
        this.accessToken = result.accessToken;
        this.idToken = result.idToken;
        this.refreshToken = result.refreshToken;
        this.expiresAt = Date.now() + result.expiresIn;
        const tokens = {
            accessToken: this.accessToken,
            idToken: this.idToken,
            refreshToken: this.refreshToken,
            isAuthenticated: true,
            isVerifying: false
        };
        await saveTokens(tokens);
        log('Successfully updated and saved tokens to tokens.json');
    }
}

async function getTokens() {
    try {
        if (!fs.existsSync(config.stork.tokenPath)) {
            throw new Error(`No tokens file found at ${config.stork.tokenPath}`);
        }
        const tokensData = await fs.promises.readFile(config.stork.tokenPath, 'utf8');
        const tokens = JSON.parse(tokensData);
        if (!tokens.accessToken || tokens.accessToken.length < 20) {
            throw new Error('Access token is invalid');
        }
        log(`Read access token: ${tokens.accessToken.substring(0, 10)}...`);
        return tokens;
    } catch (error) {
        log(`Error reading tokens: ${error.message}`, 'ERROR');
        throw error;
    }
}
async function saveTokens(tokens) {
    try {
        await fs.promises.writeFile(config.stork.tokenPath, JSON.stringify(tokens, null, 2), 'utf8');
        log('Tokens have been saved successfully');
        return true;
    } catch (error) {
        log(`Error writing tokens: ${error.message}`, 'ERROR');
        return false;
    }
}

async function refreshTokens(refreshToken) {
    try {
        log('Requesting token refresh via Stork API...');
        const response = await axios({
            method: 'POST',
            url: `${config.stork.authURL}/refresh`,
            headers: {
                'Content-Type': 'application/json',
                'User-Agent': config.stork.userAgent,
                'Origin': config.stork.origin
            },
            data: { refresh_token: refreshToken }
        });
        const tokens = {
            accessToken: response.data.access_token,
            idToken: response.data.id_token || '',
            refreshToken: response.data.refresh_token || refreshToken,
            isAuthenticated: true,
            isVerifying: false
        };
        await saveTokens(tokens);
        log('Refreshed token via Stork API');
        return tokens;
    } catch (error) {
        log(`Token refresh attempt failed: ${error.message}`, 'ERROR');
        throw error;
    }
}

async function getSignedPrices(tokens) {
    try {
        log('Gathering signed prices data...');
        const response = await axios({
            method: 'GET',
            url: `${config.stork.baseURL}/stork_signed_prices`,
            headers: {
                'Authorization': `Bearer ${tokens.accessToken}`,
                'Content-Type': 'application/json',
                'Origin': config.stork.origin,
                'User-Agent': config.stork.userAgent
            }
        });
        const dataObj = response.data.data;
        const result = Object.keys(dataObj).map(assetKey => {
            const assetData = dataObj[assetKey];
            return {
                asset: assetKey,
                msg_hash: assetData.timestamped_signature.msg_hash,
                price: assetData.price,
                timestamp: new Date(assetData.timestamped_signature.timestamp / 1000000).toISOString(),
                ...assetData
            };
        });
        log(`Acquired ${result.length} signed prices`);
        return result;
    } catch (error) {
        log(`Error acquiring signed prices: ${error.message}`, 'ERROR');
        throw error;
    }
}

async function sendValidation(tokens, msgHash, isValid, proxy) {
    try {
        const agent = getProxyAgent(proxy);
        const response = await axios({
            method: 'POST',
            url: `${config.stork.baseURL}/stork_signed_prices/validations`,
            headers: {
                'Authorization': `Bearer ${tokens.accessToken}`,
                'Content-Type': 'application/json',
                'Origin': config.stork.origin,
                'User-Agent': config.stork.userAgent
            },
            httpsAgent: agent,
            data: { msg_hash: msgHash, valid: isValid }
        });
        // log(`Validation succeeded for ${msgHash.substring(0, 10)}... via ${proxy || 'no-proxy'}`);
        return response.data;
    } catch (error) {
        // log(`Validation error for ${msgHash.substring(0, 10)}...: ${error.message}`, 'ERROR');
        throw error;
    }
}

async function getUserStats(tokens) {
    try {
        log('Retrieving user statistics...');
        const response = await axios({
            method: 'GET',
            url: `${config.stork.baseURL}/me`,
            headers: {
                'Authorization': `Bearer ${tokens.accessToken}`,
                'Content-Type': 'application/json',
                'Origin': config.stork.origin,
                'User-Agent': config.stork.userAgent
            }
        });
        return response.data.data;
    } catch (error) {
        log(`Error retrieving user stats: ${error.message}`, 'ERROR');
        throw error;
    }
}

function validatePrice(priceData) {
    try {
        //   log(`Examining data for asset: ${priceData.asset || 'unknown'}`);
        if (!priceData.msg_hash || !priceData.price || !priceData.timestamp) {
            log('Data incomplete, marked invalid', 'WARN');
            return false;
        }
        const currentTime = Date.now();
        const dataTime = new Date(priceData.timestamp).getTime();
        const timeDiffMinutes = (currentTime - dataTime) / (1000 * 60);
        if (timeDiffMinutes > 60) {
            log(`Data is older than 60 minutes (${Math.round(timeDiffMinutes)} min)`, 'WARN');
            return false;
        }
        return true;
    } catch (error) {
        log(`Price validation encountered error: ${error.message}`, 'ERROR');
        return false;
    }
}

if (!isMainThread) {
    const { priceData, tokens, proxy } = workerData;
    async function validateAndSend() {
        try {
            const isValid = validatePrice(priceData);
            await sendValidation(tokens, priceData.msg_hash, isValid, proxy);
            parentPort.postMessage({ success: true, msgHash: priceData.msg_hash, isValid });
        } catch (error) {
            parentPort.postMessage({ success: false, error: error.message, msgHash: priceData.msg_hash });
        }
    }
    validateAndSend();

} else {
    // ================== MAIN THREAD ==================

    async function runValidationProcess(tokenManager) {
        try {
            log('---------- INITIATING VALIDATION RUN ----------');
            const tokens = await getTokens();
            const initialUserData = await getUserStats(tokens);

            if (!initialUserData || !initialUserData.stats) {
                throw new Error('Unable to retrieve initial stats from server');
            }

            const signedPrices = await getSignedPrices(tokens);
            const proxies = loadProxies();

            if (!signedPrices || signedPrices.length === 0) {
                log('No new items found for validation');
                const userData = await getUserStats(tokens);
                displayStats(userData);
                return;
            }

            log(`Processing ${signedPrices.length} items using up to ${config.threads.maxWorkers} workers...`);
            const workers = [];
            const chunkSize = Math.ceil(signedPrices.length / config.threads.maxWorkers);
            const batches = [];
            for (let i = 0; i < signedPrices.length; i += chunkSize) {
                batches.push(signedPrices.slice(i, i + chunkSize));
            }

            for (let i = 0; i < Math.min(batches.length, config.threads.maxWorkers); i++) {
                const batch = batches[i];
                const proxy = proxies.length > 0 ? proxies[i % proxies.length] : null;
                batch.forEach(priceData => {
                    workers.push(new Promise((resolve) => {
                        const worker = new Worker(__filename, {
                            workerData: { priceData, tokens, proxy }
                        });
                        worker.on('message', resolve);
                        worker.on('error', (error) => resolve({ success: false, error: error.message }));
                        worker.on('exit', () => resolve({ success: false, error: 'Worker ended unexpectedly' }));
                    }));
                });
            }

            const results = await Promise.all(workers);
            const successCount = results.filter(r => r.success).length;
            log(`Completed ${successCount} out of ${results.length} validations successfully`);

            const updatedUserData = await getUserStats(tokens);
            const validNow = updatedUserData.stats.stork_signed_prices_valid_count || 0;
            const invalidNow = updatedUserData.stats.stork_signed_prices_invalid_count || 0;

            displayStats(updatedUserData);

            log(`----------- VALIDATION REPORT -----------`);
            log(`Grand total processed: ${validNow + invalidNow}`);
            log(`Successful validations: ${validNow}`);
            log(`Failed validations: ${invalidNow}`);
            log('---------------- DONE ----------------');

            if (jobs < accounts.length) {
                setTimeout(() => main(), config.stork.intervalSeconds * 1000);
            } else if (jobs == accounts.length - 1 || jobs === accounts.length) {
                jobs = 0;
                setTimeout(() => main(), config.stork.intervalSeconds * 1000);
            }
        } catch (error) {
            log(`Validation sequence aborted: ${error.message}`, 'ERROR');
        }
    }


    function displayStats(userData) {
        if (!userData || !userData.stats) {
            log('No valid stats found to display', 'WARN');
            return;
        }
        const dataForTable = {
            user: maskEmail(userData.email || 'N/A'),
            valid: userData.stats.stork_signed_prices_valid_count || 0,
            invalid: userData.stats.stork_signed_prices_invalid_count || 0,
            lastVerified: userData.stats.stork_signed_prices_last_verified_at || 'Never'
        };
        updateStats(statsTable, dataForTable);
    }

    async function logCurrentIpForAccount(accountIndex) {
        const proxies = loadProxies();
        const proxy = proxies.length > 0 ? proxies[accountIndex % proxies.length] : null;
        try {
            const agent = proxy ? getProxyAgent(proxy) : null;
            const response = await axios.get('https://api.ipify.org?format=json', {
                httpsAgent: agent,
                timeout: 10000
            });
            const currentIp = response.data.ip;
            log(`Current IP for account ${maskEmail(accounts[accountIndex].username)}: ${currentIp}`);
        } catch (error) {
            log(`Failed to fetch current IP for account ${maskEmail(accounts[accountIndex].username)}: ${error.message}`, 'ERROR');
        }
    }

    async function main() {
        if (!validateConfig()) process.exit(1);

        await logCurrentIpForAccount(jobs);
        const maskedUser = maskEmail(accounts[jobs].username);
        log(`Starting process for user: ${maskedUser}`);

        const tokenManager = new TokenManager(jobs);
        jobs++;

        try {
            await tokenManager.getValidToken();
            log('Sign-in/auth flow completed successfully');

            tokenManager.refreshInterval = setInterval(async () => {
                await tokenManager.getValidToken();
                log('Refreshed token via Cognito service');
            }, 50 * 60 * 1000);

            await runValidationProcess(tokenManager);

            clearInterval(tokenManager.refreshInterval);
        } catch (error) {
            log(`Startup failed: ${error.message}`, 'ERROR');
            process.exit(1);
        }
    }


    let jobs = 0;

    const dashboard = createDashboard();
    screen = dashboard.screen;
    statsTable = dashboard.statsTable;
    logBox = dashboard.logBox;

    main();
}
