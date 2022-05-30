// stuff to update

const proposer = "zlwb4mcq322g"; // msig proposer account
const defaultPrivateKey = ""; // msig proposer private key
const requested = [
    {"actor":"cryptolions1","permission":"gov"},
    {"actor":"dappaccinc22","permission":"active"},
    {"actor":"eosdublinwow","permission":"active"},
    {"actor":"eosiodetroit","permission":"active"},
    {"actor":"eosnationftw","permission":"active"},
    {"actor":"everythngeos","permission":"active"},
    {"actor":"luckyhahnryu","permission":"active"},
    {"actor":"matthewadams","permission":"active"},
    {"actor":"melvinpearce","permission":"active"},
    {"actor":"phoenix.vr","permission":"active"},
    {"actor":"rvrkingfishr","permission":"active"},
    {"actor":"sniirrsniirr","permission":"active"},
    {"actor":"talmuskaleos","permission":"active"},
    {"actor":"thomassamoht","permission":"daddao"},
    {"actor":"wes","permission":"active"},
];
const balancesFile = './phase-5-eos.json';

const rpcUrl = 'https://mainnet.eosn.io';
const eosioContract = "eosio.token";
const msigAuthAccount = "daddonations";
const permission = "owner";
const from = "daddonations";

// end stuff to update

const { Api, JsonRpc, RpcError, Serialize } = require('eosjs');
const { JsSignatureProvider } = require('eosjs/dist/eosjs-jssig');      // development only
const fetch = require('node-fetch');                                    // node only; not needed in browsers
const { TextEncoder, TextDecoder } = require('util');
const fs = require('fs');
const balancesFileJson = JSON.parse(fs.readFileSync(balancesFile, 'utf8'));
const signatureProvider = new JsSignatureProvider([defaultPrivateKey]);
const rpc = new JsonRpc(rpcUrl, { fetch });
const api = new Api({ rpc, signatureProvider, textDecoder: new TextDecoder(), textEncoder: new TextEncoder() });
const alphabet = [
    'a', 'b', 'c', 'd', 'e', 
    'f', 
    'g',
    'h', 'i', 'j',
    'k', 
    'l',
    'm', 
    'n', 
    'o', 
    'p', 
    'q', 
    'r',
    's', 't', 'u', 'v', 'w', 'x',
    'y', 'z'
];
const delay = s => new Promise(res => setTimeout(res, s*1000));

const template = {
    account: "",
    name: "transfer",
    authorization: [
        {
            actor: msigAuthAccount,
            permission
        }
    ],
    data: {
        from,
        to:"",
        quantity:"",
        memo:"recover tokens"
    }
}

let actions = [], total = 0;

balancesFileJson.forEach(el => {
    if(el.key) {
        const EOS = Number(el.EOS);
        if(EOS > 0.005) {
            const temp = JSON.parse(JSON.stringify(template));
            temp.account = eosioContract;
            temp.data.to = el.key;
            temp.data.quantity = `${EOS.toFixed(4)} EOS`;
            actions.push(temp);
        }
    }
});

console.log(`${balancesFile} accounts: ${actions.length} | total: ${total}`);

const splitArray = [];
let splitSize = 100;

for (let j = 0; j < actions.length; j += splitSize) {
    splitArray.push(actions.slice(j, j + splitSize));
}

const proposeRetry = (splitArray, i, n) => propose(splitArray, i).catch(function(error) {
    if (n === 1) throw error;
    return proposeRetry(splitArray, i, n - 1);
});

const propose = async (splitArray, i) => {
    console.log(`proposing transfer${alphabet[i]} with ${splitArray[i].length} actions`);

    const serialized_actions = await api.serializeActions(splitArray[i])
    const proposeInput = {
        proposer,
        proposal_name: `transfer${alphabet[i]}`,
        requested,
        trx: {
            expiration: '2023-04-29T23:11:48',
            ref_block_num: 22480,
            ref_block_prefix: 3659047377,
            max_net_usage_words: 0,
            max_cpu_usage_ms: 0,
            delay_sec: 0,
            context_free_actions: [],
            actions: serialized_actions,
            transaction_extensions: []
        }
    };

    //PROPOSE THE TRANSACTION
    await api.transact(
        {
            actions: [
                {
                    account: 'eosio.msig',
                    name: 'propose',
                    authorization: [{
                        actor: proposer,
                        permission: 'active',
                    }],
                    data: proposeInput,
                }
            ]
        }, {
            blocksBehind: 3,
            expireSeconds: 30,
            broadcast: true,
            sign: true
        }
    );
    await delay(15);
}

(async () => {
    for(let i = 0; i < splitArray.length; i++) {
        const retries = 10;
        try {
            await propose(splitArray, i);
        } catch(e) {
            console.log(e);
            await proposeRetry(splitArray, i, retries);
        }
    }
})();