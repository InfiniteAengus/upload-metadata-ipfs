const axios = require('axios')
const fs = require('fs-extra')
const FormData = require('form-data')
const recursive = require('recursive-fs')
const basePathConverter = require('base-path-converter')
const path = require('path')
const rimraf = require('rimraf')
require('dotenv').config()

const assetsDir = './metadata/assets'
const tempMetaDir = './metadata/temp'
const fileIpfsUrl = 'https://api.pinata.cloud/pinning/pinFileToIPFS'
const gatewayBaseUrl = 'https://gateway.pinata.cloud/ipfs/'
const metadataFile = '../metadata/metadata.json'
const contractUriile = '../metadata/contracturi.json'
let gatewayUrl = ''
let assetCount = 0
let tokenCount = 0
let assetsHash = ''
let metadataHash = ''
let contractUriHash = ''

// const api = axios.create({
//   headers: {
//     common: {
//       pinata_api_key: process.env.PINATA_API_KEY,
//       pinata_secret_api_key: process.env.PINATA_API_SECRET,
//     },
//   },
// })

const uploadAssets = () => new Promise((resolve, reject) => {
  assetCount = 0
  recursive.readdirr(assetsDir, (err, dirs, files) => {
    // console.log("uploadAssets: ", files)
    const data = new FormData()
    files.forEach((file) => {
      const temp = file.split('.')
      const extension = temp[temp.length - 1]
      if (!['png', 'jpg', 'jpeg', 'gif'].includes(extension)) {
        return
      }

      assetCount += 1
      data.append(`file`, fs.createReadStream(file), {
        filepath: basePathConverter(assetsDir, file),
      })
    })

    axios.post(fileIpfsUrl, data, {
      maxContentLength: 'Infinity',
      maxBodyLength: 'Infinity',
      headers: {
        'Content-Type': `multipart/form-data; boundary=${data._boundary}`,
        pinata_api_key: process.env.PINATA_API_KEY,
        pinata_secret_api_key: process.env.PINATA_API_SECRET,
      },
    }).then(res => resolve(res), err => reject(err))
  })
})

const deploy = async () => {
  // upload metadata/assets to ipfs
  console.log(process.env.PINATA_API_KEY, process.env.PINATA_API_SECRET);
  try {
    const res1 = await uploadAssets()
    assetsHash = res1.data.IpfsHash
    gatewayUrl = gatewayBaseUrl + assetsHash
    console.log("uploaded assets: ", assetsHash, gatewayUrl)
  } catch (err) {
    console.log("Error");
  }

}

(async () => {
  await deploy()
})();
