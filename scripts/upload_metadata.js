const axios = require('axios')
const fs = require('fs-extra')
const FormData = require('form-data')
const recursive = require('recursive-fs')
const basePathConverter = require('base-path-converter')
const path = require('path')
const rimraf = require('rimraf')
require('dotenv').config()

const param = process.argv[2];

const assetsDir = './metadata/assets'
const tempMetaDir = './metadata/temp'
const fileIpfsUrl = 'https://api.pinata.cloud/pinning/pinFileToIPFS'
const gatewayBaseUrl = 'https://braindance.mypinata.cloud/ipfs/'
const metadataFile = `../metadata/metadata${(param ? "_" + param : "")}.json`
const contractUriile = '../metadata/contracturi.json'
let gatewayUrl = ''
let assetCount = 0
let tokenCount = 0
let assetsHash = ''
let metadataHash = ''
let contractUriHash = ''

const api = axios.create({
  headers: {
    common: {
      pinata_api_key: process.env.PINATA_API_KEY,
      pinata_secret_api_key: process.env.PINATA_API_SECRET,
    },
  },
})

const uploadMetadata = () => new Promise((resolve, reject) => {
  const tokensDir = tempMetaDir + '/tokens' + (param ? "_" + param : "")
  const jsonData = require(metadataFile)

  // Delete all files in tempMetaDir
  rimraf.sync(tokensDir)

  // recreate directory
  fs.mkdirSync(tempMetaDir, { recursive: true })
  fs.mkdirSync(tokensDir, { recursive: true })

  // upload each metadata to a specific json file
  jsonData.forEach((metadata, index) => {
    // if (index > 100) {
    //   return
    // }
    const tokenId = index.toString().padStart(5, "0")
    tokenCount += 1
    // metadata.id = tokenId
    // metadata.image = `${gatewayUrl}/image_${tokenId}.png`
    // metadata.external_url = metadata.image

    const filename = tokensDir + '/' + index
    const st = JSON.stringify(metadata, null, 2)
    fs.writeFileSync(filename, st)
  })

  recursive.readdirr(tokensDir, (err, dirs, files) => {
    let data = new FormData()
    files.forEach((file) => {
      data.append(`file`, fs.createReadStream(file), {
        filepath: basePathConverter(tokensDir, file),
      })
    })

    api.post(fileIpfsUrl, data, {
      maxContentLength: 'Infinity',
      maxBodyLength: 'Infinity',
      headers: {
        'Content-Type': `multipart/form-data; boundary=${data._boundary}`
      },
    }).then(res => resolve(res), err => reject(err))
  })
})

const uploadContractUri = () => new Promise((resolve, reject) => {
  const contractUriFile = tempMetaDir + '/contracturi.json'
  const contractUri = require(contractUriile)

  contractUri.image = gatewayUrl + '/' + contractUri.image

  const st = JSON.stringify(contractUri, null, 2)
  fs.writeFileSync(contractUriFile, st)

  const data = new FormData()
  data.append(`file`, fs.createReadStream(contractUriFile))

  api.post(fileIpfsUrl, data, {
    maxContentLength: 'Infinity',
    headers: {
      'Content-Type': `multipart/form-data; boundary=${data._boundary}`
    },
  }).then(res => resolve(res), err => reject(err))
})

const deploy = async () => {
  // 1. distribute metadata/mono_metadata.json's metadata to metadata/temp/tokens/metadata.id
  // 2. upload distributed files to ipfs
  const res2 = await uploadMetadata()
  metadataHash = res2.data.IpfsHash
  console.log("uploaded metadata: ", gatewayBaseUrl + metadataHash + "/")

  // upload contracturi.json to ipfs
  const res3 = await uploadContractUri()
  contractUriHash = res3.data.IpfsHash
  console.log("uploaded contract: ", gatewayBaseUrl + contractUriHash + "/")

  const configFile = tempMetaDir + `/ERC721Config${param ? "_" + param : ""}.json`;
  const metadataConfig = {
    "gatewayUrl": gatewayBaseUrl,
    "metadataHash": metadataHash,
    "imagesHash": assetsHash,
    "contractUriHash": contractUriHash,
    "tokenAmount": assetCount
  }

  const st = JSON.stringify(metadataConfig, null, 2);
  fs.writeFileSync(configFile, st);
}

(async () => {
  await deploy()
})();