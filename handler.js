const { default: axios } = require('axios');
const fs = require('fs');
const ProgressBar = require('progress')
const path = require('path')
const async = require('async');
const chalk = require('chalk');
const delay = ms => new Promise((resolve) => setTimeout(resolve, ms))
let cookieString = fs.readFileSync('cookie', 'utf-8')
let cookie = convertCookie(cookieString)
global.task

function convertCookie(cookies) {
    try {
        return JSON.parse(cookies).map(x => `${x.name}=${x.value}`).join('; ')
    } catch (error) {
        return cookies
    }
}

const headers = {
    'user-agent': 'com.zhiliaoapp.musically/2022405010 (Linux; U; Android 7.1.2; en; ASUS_Z01QD; Build/N2G48H;tt-ok/3.12.13.1)',
    cookie
}

// https://stackoverflow.com/questions/57362319/how-to-download-files-one-by-one-in-node-js
class Downloader {
    constructor(folder) {
        this.folder = folder
        this.q = async.queue(this.singleFile, 1);
        this.q.concurrency = 1
        this.q.pause
        this.taskDone = 0
        this.done = false

        // assign a callback
        this.q.drain(() => {
            console.log('All Videos downloaded successfully');
            this.done = true
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
        // console.log(this.taskDone);
        if (fs.existsSync(path.resolve(__dirname, 'download', this.folder, `${link.id}.mp4`))) {
            console.log(`[ ${chalk.hex('#f12711')(link.id)} already downloaded! ] ===== [${chalk.hex('#7F7FD5')('skipped')}]`);
            this.q.remove(x => x.data.id == link.id)
            this.q.resume()
        } else {
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
                    incomplete: '+',
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
                    this.taskDone = this.taskDone + 1
                })
                const writer = fs.createWriteStream(path.resolve(__dirname, 'download', foldername, `${link.id}.mp4`))
                data.pipe(writer)
            })
        }
    }
}

const formatK = (n) => {
    return Number(n).toLocaleString('en', { notation: 'compact' })
}

let params = {
    device_id: '6158568364873266588',
    version_code: '100303',
    build_number: '10.3.3',
    version_name: '10.3.3',
    aid: '1233',
    app_name: 'musical_ly',
    app_language: 'en',
    channel: 'googleplay',
    device_platform: 'android',
    device_brand: 'Google',
    device_type: 'Pixel',
    os_version: '9.0.0'
}

class TikTok {
    constructor() { }

    headers = {
        "User-Agent": "okhttp",
    }
    RequestAweme = async (path, method = 'GET') => {
        let url = `https://api-t2.tiktokv.com${path}${new URLSearchParams(params).toString()}`

        return await axios({
            url,
            method,
            headers: headers
        })
    }

    searchUser = async (username) => {
        const endpoint = `/aweme/v1/discover/search/`
            + `?keyword=` + username
            + `&cursor=0`
            + `&count=10`
            + `&type=1`
            + `&hot_search=0`
            + `&search_source=discover`

        const res = await this.RequestAweme(endpoint, 'GET')
        console.log(res);
    }
}

// fixed by using this code : https://github.com/mominkali/tikdate/blob/3bf790be9ae19f727e2956f0764b0f0fff3bf21e/tikdate.py
async function searchUser(username) {
    try {
        const path = `/aweme/v1/discover/search/`
            + `?keyword=` + username
            + `&cursor=0`
            + `&count=10`
            + `&type=1`
            + `&hot_search=0`
            + `&search_source=discover`
        const { data } = await axios.get(`https://api-t2.tiktokv.com${path}${new URLSearchParams(params).toString()}`, {
            headers,
        });
        // console.log(data);
        return data.user_list;
    } catch (error) {
        console.log(error);
    }
}

// new TikTok().searchUser('lailaindahb')
// searchUser('lailaindahb')

async function getVideoList(userId, count = 100, minCursor = 0, maxCursor = 0) {
    const res = await axios.get(`https://m.tiktok.com/share/item/list?id=${userId}&type=1&count=${count}&minCursor=${minCursor}&maxCursor=${maxCursor}`, { headers })
    return res.data.body
}

// getVideoList('6847876230878020609').then(x => console.log(x.itemListData.length))

async function getDownloadLink(id) {
    const res = await axios.get('https://api2.musical.ly/aweme/v1/feed/?aweme_id=' + id, { headers })
    const filtered = res.data.aweme_list.find(x => x.aweme_id == id)
    return filtered.video.play_addr.url_list[0]
}

module.exports = {
    Downloader,
    formatK,
    searchUser,
    getVideoList,
    getDownloadLink
}