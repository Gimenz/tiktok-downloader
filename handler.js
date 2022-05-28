const { default: axios } = require('axios');
const fs = require('fs');
const ProgressBar = require('progress')
const path = require('path')
const async = require('async');
const chalk = require('chalk');
const delay = ms => new Promise((resolve) => setTimeout(resolve, ms))

// https://stackoverflow.com/questions/57362319/how-to-download-files-one-by-one-in-node-js
class Downloader {
    constructor(folder) {
        this.folder = folder
        this.q = async.queue(this.singleFile, 1);
        this.q.concurrency = 1
        this.q.pause

        // assign a callback
        this.q.drain(function () {
            console.log('All Videos downloaded successfully');
        });

        // assign an error callback
        this.q.error(function (err, task) {
            console.log(err);
            console.error('task experienced an error', task);
        });
    }

    async downloadFiles(links) {
        for (let link of links) {
            this.q.push(link);
        }
    }

    singleFile = async (link, cb) => {
        this.q.pause()
        const url = await getDownloadLink(link.id)
        await axios({
            url,
            method: 'GET',
            responseType: 'stream'
        }).then(async ({ data, headers }) => {
            const totalLength = headers['content-length']

            const progressBar = new ProgressBar(`[${chalk.hex('#99f2c8')(link.index)}] [ ${chalk.hex('#ffff1c')(link.id)} ] [${chalk.hex('#6be585')(':bar')}] :percent downloaded in :elapseds`, {
                width: 40,
                complete: '=',
                incomplete: ' ',
                renderThrottle: 1,
                total: parseInt(totalLength)
            })

            let foldername = this.folder
            if (!fs.existsSync('download')) fs.mkdirSync('download')
            if (!fs.existsSync(`download/${foldername}`)) {
                fs.mkdirSync(`download/${foldername}`)
            }

            data.on('data', (chunk) => {
                progressBar.tick(chunk.length)
            })
            data.on('end', () => {
                // console.log(`✓ [ ${link} ] Downloaded.`);
                // cb()
                this.q.resume()
            })
            const writer = fs.createWriteStream(path.resolve(__dirname, 'download', foldername, `${link.id}.mp4`))
            data.pipe(writer)
        })
    }
}

const formatK = (n) => {
    return Number(n).toLocaleString('en', { notation: 'compact' })
}

const headers = {
    'user-agent': 'Mozilla/5.0 (Linux; Android 8.0; Pixel 2 Build/OPD3.170816.012) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/87.0.4280.88 Mobile Safari/537.36 Edg/87.0.664.66'
}

async function searchUser(username) {
    try {
        const { data } = await axios.get(`https://api2.musical.ly/aweme/v1/discover/search/?keyword=${username}&count=10&type=1&device_id=6158568364873266588&aid=1233`, {
            headers,
        });
        return data.user_list;
    } catch (error) {
        console.log(error);
    }
}

async function getVideoList(userId, count = 30, minCursor = 0, maxCursor = 0) {
    const res = await axios.get(`https://m.tiktok.com/share/item/list?id=${userId}&type=1&count=${count}&minCursor=${minCursor}&maxCursor=${maxCursor}`, { headers })
    return res.data.body
}

async function getDownloadLink(id) {
    const res = await axios.get('https://api2.musical.ly/aweme/v1/aweme/detail/?aweme_id=' + id)
    return res.data.aweme_detail.video.play_addr.url_list[0]
}


module.exports = {
    Downloader,
    formatK,
    searchUser,
    getVideoList,
    getDownloadLink
}