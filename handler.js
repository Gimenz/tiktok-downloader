const { default: axios } = require('axios');
const { createCipheriv } = require('node:crypto')
const fs = require('fs');
const ProgressBar = require('progress')
const path = require('path')
const async = require('async');
const chalk = require('chalk');
const delay = ms => new Promise((resolve) => setTimeout(resolve, ms))
let cookieString = fs.readFileSync('cookie', 'utf-8')
let cookie = convertCookie(cookieString)
const crypto = require('crypto')
global.task

function convertCookie(cookies) {
    try {
        return JSON.parse(cookies).map(x => `${x.name}=${x.value}`).join('; ')
    } catch (error) {
        return cookies
    }
}

// https://github.com/atharahmed/tiktok-private-api/blob/main/src/services/signer.service.ts
function xttparams(params) {
    // Encrypt query string using aes-128-cbc
    const cipher = createCipheriv(
        "aes-128-cbc",
        "webapp1.0+202106",
        "webapp1.0+202106"
    );
    return Buffer.concat([cipher.update(params), cipher.final()]).toString(
        "base64"
    );
}

const _defaultApiParams = {
    aid: "1988",
    count: 30,
    secUid: null,
    cursor: 0,
    cookie_enabled: true,
    screen_width: 0,
    screen_height: 0,
    browser_language: "",
    browser_platform: "",
    browser_name: "",
    browser_version: "",
    browser_online: "",
    timezone_name: "Europe/London",
};

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
            try {
                const url = await getDownloadLink(link.id)
                await axios({
                    url,
                    method: 'GET',
                    responseType: 'stream'
                }).then(async ({ data, headers }) => {
                    const totalLength = headers['content-length']

                    const progressBar = new ProgressBar(`[${chalk.hex('#99f2c8')(link.index)}] [ ${chalk.hex('#ffff1c')(link.id)} ] [${chalk.hex('#6be585')(':bar')}] :percent downloaded in :elapseds`, {
                        width: 40,
                        complete: '<',
                        incomplete: '•',
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
                        this.q.resume()
                        this.taskDone = this.taskDone + 1
                    })
                    const writer = fs.createWriteStream(path.resolve(__dirname, 'download', foldername, `${link.id}.mp4`))
                    data.pipe(writer)
                })
            } catch (error) {
                console.log(`[ ${chalk.hex('#f12711')(link.id)} got error while trying to get video data! ] ===== [${chalk.hex('#7F7FD5')('skipped')}]`);
                this.q.resume()
            }
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

async function getUserInfo(user) {
    const res = await axios.get(`https://api.tiktokv.com/aweme/v1/multi/aweme/detail/?aweme_ids=%5B{${user}}%5D`, {
        headers: {
            "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/101.0.4951.54 Safari/537.36",
        }
    })
    return res.data
}


async function getVideoList(secUid, count = 30, cursor = 0) {
    const param = {
        ..._defaultApiParams,
        secUid: secUid,
        cursor: cursor,
        count: count,
        is_encryption: 1,
    }
    const xTTParams = xttparams(new URLSearchParams(param).toString())
    const res = await axios.get('https://www.tiktok.com/api/post/item_list/?aid=1988&app_language=en&app_name=tiktok_web&battery_info=1&browser_language=en-US&browser_name=Mozilla&browser_online=true&browser_platform=Win32&browser_version=5.0%20%28Windows%20NT%2010.0%3B%20Win64%3B%20x64%29%20AppleWebKit%2F537.36%20%28KHTML%2C%20like%20Gecko%29%20Chrome%2F107.0.0.0%20Safari%2F537.36%20Edg%2F107.0.1418.35&channel=tiktok_web&cookie_enabled=true&device_id=7002566096994190854&device_platform=web_pc&focus_state=false&from_page=user&history_len=3&is_fullscreen=false&is_page_visible=true&os=windows&priority_region=RO&referer=https%3A%2F%2Fexportcomments.com%2F&region=RO&root_referer=https%3A%2F%2Fexportcomments.com%2F&screen_height=1440&screen_width=2560&tz_name=Europe%2FBucharest&verifyFp=verify_lacphy8d_z2ux9idt_xdmu_4gKb_9nng_NNTTTvsFS8ao&webcast_language=en&msToken=7UfjxOYL5mVC8QFOKQRhmLR3pCjoxewuwxtfFIcPweqC05Q6C_qjW-5Ba6_fE5-fkZc0wkLSWaaesA4CZ0LAqRrXSL8b88jGvEjbZPwLIPnHeyQq6VifzyKf5oGCQNw_W4Xq12Q-8KCuyiKGLOw=&X-Bogus=DFSzswVL-XGANHVWS0OnS2XyYJUm', {
        headers: {
            ...headers,
            'user-agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/107.0.0.0 Safari/537.36 Edg/107.0.1418.35',
            "x-tt-params": xTTParams,
        }
    })
    return res.data
}

// getVideoList('MS4wLjABAAAAPkIdksWtpSxQgc5NjgJIzN3mHuS7hVxaGq7VaNPEJSU').then(x => console.log(x))

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