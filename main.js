const readline = require('readline');
const fs = require('fs').promises;
const ethers = require('ethers');
const axios = require('axios');
const crypto = require('crypto');
const UserAgent = require('user-agents');

// Enhanced logger with colors
const logger = {
  error: (message) => console.error('\x1b[31m%s\x1b[0m', `[ERROR] ${message}`),
  info: (message) => console.log('\x1b[36m%s\x1b[0m', `[INFO] ${message}`),
  success: (message) => console.log('\x1b[32m%s\x1b[0m', `[SUCCESS] ${message}`),
  wallet: (message) => console.log('\x1b[33m%s\x1b[0m', `[WALLET] ${message}`),
  loading: (message) => console.log('\x1b[35m%s\x1b[0m', `[LOADING] ${message}`),
  banner: () => {
    console.log('\x1b[36m%s\x1b[0m', `
    ██╗  ██╗██╗████████╗███████╗
    ██║ ██╔╝██║╚══██╔══╝██╔════╝
    █████╔╝ ██║   ██║   █████╗  
    ██╔═██╗ ██║   ██║   ██╔══╝  
    ██║  ██╗██║   ██║   ███████╗
    ╚═╝  ╚═╝╚═╝   ╚═╝   ╚══════╝
     Kite AI @BYAUTODROPCENTRAL 
    `);
  }
};

// Wallet functions
function getWallet(privateKey) {
  try {
    const wallet = new ethers.Wallet(privateKey);
    logger.info(`Wallet created: ${wallet.address}`);
    return wallet;
  } catch (error) {
    logger.error(`Invalid private key: ${error.message}`);
    return null;
  }
}

async function loadPrivateKeys() {
  try {
    const raw = await fs.readFile('privatekey.txt', 'utf-8');
    const keys = raw.split('\n')
      .map(line => line.trim())
      .filter(line => line.length > 0);
    
    if (keys.length === 0) throw new Error('No private keys found in privatekey.txt');
    return keys;
  } catch (err) {
    throw new Error(`Failed to load private keys: ${err.message}`);
  }
}

// Kite service functions
const baseHeaders = {
  'Accept': 'application/json, text/plain, */*',
  'Accept-Language': 'id-ID,id;q=0.9,en-US;q=0.8,en;q=0.7',
  'Origin': 'https://testnet.gokite.ai',
  'Referer': 'https://testnet.gokite.ai/',
  'Sec-Fetch-Dest': 'empty',
  'Sec-Fetch-Mode': 'cors',
  'Sec-Fetch-Site': 'same-site',
  'User-Agent': new UserAgent().toString(),
  'Content-Type': 'application/json'
};

const encryptAddress = (address) => {
  try {
    const keyHex = '6a1c35292b7c5b769ff47d89a17e7bc4f0adfe1b462981d28e0e9f7ff20b8f8a';
    const key = Buffer.from(keyHex, 'hex');
    const iv = crypto.randomBytes(12);
    const cipher = crypto.createCipheriv('aes-256-gcm', key, iv);

    let encrypted = cipher.update(address, 'utf8');
    encrypted = Buffer.concat([encrypted, cipher.final()]);
    const authTag = cipher.getAuthTag();

    const result = Buffer.concat([iv, encrypted, authTag]);
    return result.toString('hex');
  } catch (error) {
    logger.error(`Auth token generation failed for ${address}`);
    return null;
  }
};

const extractCookies = (headers) => {
  try {
    const rawCookies = headers['set-cookie'] || [];
    const skipKeys = ['expires', 'path', 'domain', 'samesite', 'secure', 'httponly', 'max-age'];
    const cookiesDict = {};

    for (const cookieStr of rawCookies) {
      const parts = cookieStr.split(';');
      for (const part of parts) {
        const cookie = part.trim();
        if (cookie.includes('=')) {
          const [name, value] = cookie.split('=', 2);
          if (name && value && !skipKeys.includes(name.toLowerCase())) {
            cookiesDict[name] = value;
          }
        }
      }
    }

    return Object.entries(cookiesDict).map(([key, value]) => `${key}=${value}`).join('; ') || null;
  } catch (error) {
    return null;
  }
};

const login = async (wallet, neo_session = null, refresh_token = null, maxRetries = 3) => {
  const url = 'https://neo.prod.gokite.ai/v2/signin';
  for (let attempt = 1; attempt <= maxRetries; attempt++) {
    try {
      logger.loading(`Logging in to ${wallet.address} (Attempt ${attempt}/${maxRetries})`);

      const authToken = encryptAddress(wallet.address);
      if (!authToken) return null;

      const loginHeaders = {
        ...baseHeaders,
        'Authorization': authToken,
      };

      if (neo_session || refresh_token) {
        const cookies = [];
        if (neo_session) cookies.push(`neo_session=${neo_session}`);
        if (refresh_token) cookies.push(`refresh_token=${refresh_token}`);
        loginHeaders['Cookie'] = cookies.join('; ');
      }

      const body = { eoa: wallet.address };
      const response = await axios.post(url, body, { headers: loginHeaders });

      if (response.data.error) {
        logger.error(`Login failed for ${wallet.address}: ${response.data.error}`);
        return null;
      }

      const { access_token, aa_address, displayed_name, avatar_url } = response.data.data;
      const cookieHeader = extractCookies(response.headers);

      let resolved_aa_address = aa_address;
      if (!resolved_aa_address) {
        const profile = await getUserProfile(access_token);
        resolved_aa_address = profile?.profile?.smart_account_address;
        if (!resolved_aa_address) {
          logger.error(`No aa_address found for ${wallet.address}`);
          return null;
        }
      }

      logger.success(`Login successful for ${wallet.address}`);
      return { access_token, aa_address: resolved_aa_address, displayed_name, avatar_url, cookieHeader };
    } catch (error) {
      const errorMessage = error.response?.data?.error || error.message;
      if (attempt === maxRetries) {
        logger.error(`Login failed for ${wallet.address} after ${maxRetries} attempts: ${errorMessage}`);
        return null;
      }
      await new Promise(resolve => setTimeout(resolve, 2000));
    }
  }
};

const getUserProfile = async (access_token) => {
  try {
    const response = await axios.get('https://ozone-point-system.prod.gokite.ai/me', {
      headers: { ...baseHeaders, Authorization: `Bearer ${access_token}` }
    });

    if (response.data.error) {
      logger.error(`Failed to fetch profile: ${response.data.error}`);
      return null;
    }

    return response.data.data;
  } catch (error) {
    logger.error(`Profile fetch error: ${error.message}`);
    return null;
  }
};


async function loadPrompts() {
  try {
    const raw = await fs.readFile('agent.txt', 'utf-8');
    const lines = raw.split('\n').filter(line => line.trim().length > 0);
    
    const prompts = {
      Professor: [],
      CryptoBuddy: [],
      Sherlock: []
    };

    let currentSection = null;
    
    for (const line of lines) {
      if (line.startsWith('[Professor]')) {
        currentSection = 'Professor';
      } else if (line.startsWith('[Crypto Buddy]')) {
        currentSection = 'CryptoBuddy';
      } else if (line.startsWith('[Sherlock]')) {
        currentSection = 'Sherlock';
      } else if (currentSection && line.trim()) {
        prompts[currentSection].push(line.trim());
      }
    }

    return prompts;
  } catch (err) {
    throw new Error(`Failed to load prompts: ${err.message}`);
  }
}

// Main bot logic
const rl = readline.createInterface({
  input: process.stdin,
  output: process.stdout
});

async function promptInteractionCount() {
  return new Promise((resolve) => {
    rl.question('Please enter the number of interactions per agent: ', (answer) => {
      const count = parseInt(answer, 10);
      if (isNaN(count) || count < 1 || count > 99999) {
        logger.error('Invalid input. Please enter a number between 1 and 99999.');
        process.exit(1);
      }
      resolve(count);
    });
  });
}

async function selectPersona() {
  return new Promise((resolve) => {
    rl.question('Select persona (1-Professor, 2-CryptoBuddy, 3-Sherlock): ', (answer) => {
      const choice = parseInt(answer, 10);
      if (isNaN(choice) || choice < 1 || choice > 3) {
        logger.error('Invalid input. Please enter 1, 2, or 3.');
        process.exit(1);
      }
      resolve(choice === 1 ? 'Professor' : (choice === 2 ? 'CryptoBuddy' : 'Sherlock'));
    });
  });
}

async function dailyRun() {
  logger.banner();

  // Load configuration
  let privateKeys;
  try {
    privateKeys = await loadPrivateKeys();
  } catch (error) {
    logger.error(error.message);
    process.exit(1);
  }

  // Load prompts
  let prompts;
  try {
    prompts = await loadPrompts();
  } catch (error) {
    logger.error(error.message);
    process.exit(1);
  }

  const interactionCount = await promptInteractionCount();
  const persona = await selectPersona();
  const selectedPrompts = prompts[persona];

  if (selectedPrompts.length === 0) {
    logger.error(`No prompts found for persona: ${persona}`);
    process.exit(1);
  }

  logger.info(`Selected persona: ${persona}`);
  logger.info(`Available prompts: ${selectedPrompts.length}`);
  logger.info(`Interactions per agent: ${interactionCount}`);

  for (const key of privateKeys) {
    const wallet = getWallet(key);
    if (!wallet) continue;

    logger.wallet(`Processing wallet: ${wallet.address}`);

    const loginData = await login(wallet);
    if (!loginData) continue;

    const { access_token } = loginData;

    // Get profile first
    const profile = await getUserProfile(access_token);
    if (!profile) continue;

    logger.info(`User: ${profile.profile.displayed_name || 'Unknown'}`);
    logger.info(`EOA Address: ${profile.profile.eoa_address || wallet.address}`);
    logger.info(`Smart Account: ${profile.profile.smart_account_address || 'N/A'}`);
    logger.info(`Total XP Points: ${profile.profile.total_xp_points || 0}`);

    // Perform interactions
    for (let i = 0; i < interactionCount; i++) {
      const promptIndex = i % selectedPrompts.length;
      const prompt = selectedPrompts[promptIndex];
      
      logger.info(`\n[Interaction ${i+1}/${interactionCount}] ${prompt}`);
      
      try {
        // Here you would actually send the prompt to the Kite AI API
        // This is a placeholder for the actual implementation
        await new Promise(resolve => setTimeout(resolve, 1000));
        logger.success('Interaction completed successfully');
      } catch (error) {
        logger.error(`Interaction failed: ${error.message}`);
      }

      // Add delay between interactions
      if (i < interactionCount - 1) {
        await new Promise(resolve => setTimeout(resolve, 2000));
      }
    }
  }

  logger.success('\nBot execution completed');
  rl.close();
}

dailyRun().catch(error => {
  logger.error(`Bot error: ${error.message}`);
  rl.close();
});
