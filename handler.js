const { default: axios } = require('axios');
const { createCipheriv } = require('node:crypto')
const fs = require('fs');
const ProgressBar = require('progress')
const path = require('path')
const async = require('async');
const chalk = require('chalk');
const delay = ms => new Promise((resolve) => setTimeout(resolve, ms))
const crypto = require('crypto');
const { TikTokClient } = require('./node_modules/tiktok-private-api/build/index')
global.task

function convertCookie(cookies) {
    let cookie;
    try {
        cookie = JSON.parse(cookies).map(x => `${x.name}=${x.value}`).join('; ')
    } catch (error) {
        cookie = cookies
    }
    return cookie
}

let cookie = fs.existsSync('cookie') ? convertCookie(fs.readFileSync('cookie', 'utf-8')) : ''
let headers = {
    'user-agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/107.0.0.0 Safari/537.36 Edg/107.0.1418.35',
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
        let foldername = this.folder
        const mediaPath = link.type == 'image' ? `download/${foldername}/${link.title}` : `download/${foldername}`
        const fileName = link.type == 'image' ? `${link.id}_${link.img_index}.jpeg` : `${link.id}.mp4`
        if (!fs.existsSync('download')) fs.mkdirSync('download')
        if (!fs.existsSync(mediaPath)) {
            fs.mkdirSync(mediaPath)
        }

        if (fs.existsSync(mediaPath + '/' + fileName)) {
            console.log(`[${chalk.hex('#99f2c8')(link.index)}] [ ${chalk.hex('#f12711')(link.id)} ] [ ${chalk.hex('#f12711')('already downloaded!')} ] ==> [${chalk.hex('#7F7FD5')('skipped')}]`);
            this.q.remove(x => x.data.id == link.id)
            this.q.resume()
        } else {
            this.q.pause()
            try {
                const url = link.type == 'video' ? await getDownloadLink(link.id) : link.img_url
                await axios({
                    url,
                    method: 'GET',
                    responseType: 'stream'
                }).then(async ({ data, headers }) => {
                    const totalLength = headers['content-length']
                    let log = `[${chalk.hex('#FCE4EC')(link.index)}] ` +
                        `[ ${chalk.hex('#00B0FF')(link.id)} ] ` +
                        `[ ${link.type == 'video' ? chalk.hex('#916eff')('video') : chalk.hex('#aaf255')('image')} ${link.type == 'video' ? '' : `${chalk.hex('#ffff1c')(`${link.img_index}`)}`} ] ` +
                        `[ ${chalk.hex('#6be585')(':bar')}] ` +
                        `:percent downloaded in :elapseds`
                    const progressBar = new ProgressBar(log, {
                        width: 40,
                        complete: '<',
                        incomplete: '•',
                        renderThrottle: 10,
                        total: parseInt(totalLength)
                    })

                    data.on('data', (chunk) => {
                        progressBar.tick(chunk.length)
                    })
                    data.on('end', () => {
                        this.q.resume()
                        this.taskDone = this.taskDone + 1
                    })
                    // const writer = fs.createWriteStream(path.resolve(__dirname, 'download', foldername, `${link.id}.mp4`))
                    const writer = fs.createWriteStream(mediaPath + '/' + fileName)
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


// fixed by using this code : https://github.com/mominkali/tikdate/blob/3bf790be9ae19f727e2956f0764b0f0fff3bf21e/tikdate.py
async function searchUser(username) {
    try {
        let ob = {
            WebIdLastTime: '1688494715',
            aid: '1988',
            app_language: 'en',
            app_name: 'tiktok_web',
            browser_language: 'en-US',
            browser_name: 'Mozilla',
            browser_online: 'true',
            browser_platform: 'Win32',
            browser_version: '5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/118.0.0.0 Safari/537.36',
            channel: 'tiktok_web',
            cookie_enabled: 'true',
            cursor: '0',
            device_id: '7252029459376145938',
            device_platform: 'web_pc',
            focus_state: 'true',
            from_page: 'search',
            history_len: '6',
            is_fullscreen: 'false',
            is_page_visible: 'true',
            keyword: username,
            os: 'windows',
            priority_region: 'ID',
            referer: '',
            region: 'ID',
            screen_height: '1080',
            screen_width: '1920',
            tz_name: 'Asia/Jakarta',
        }
        const { data } = await axios.get(`https://www.tiktok.com/api/search/user/full/?${new URLSearchParams(ob).toString()}`, {
            headers: {
                'user-agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/107.0.0.0 Safari/537.36 Edg/107.0.1418.35',
                cookie
            },
        });
        return data.user_list;
    } catch (error) {
        console.log(error);
    }
}


async function getVideoList(secUid, count = 30, cursor = 0) {
    try {
        const TikTokApi = new TikTokClient();
        TikTokApi.state.defaultHeaders = {
            headers
        };
        const data = await TikTokApi.user.videos('', secUid, count, cursor)
        // console.log(data);
        return data
    } catch (error) {
        console.log(error);
    }
}

// getVideoList('MS4wLjABAAAAHYX7r5EzjxLQ7whZLAwpscERO7k4L18xgWqt0ShUj29dsupS6eH8LtCVWPVPDOzP').then(x => {
//     console.log(x.itemList)
// })
// const { TikTokClient } = require('./node_modules/tiktok-private-api/build/index');

// (async () => {
//     const TikTokApi = new TikTokClient();
//     TikTokApi.state.defaultHeaders = {
//         ...TikTokApi.state.defaultHeaders,
//         "user-agent": "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/108.0.0.0 Safari/537.36",
//         "sec-ch-ua": '"Not?A_Brand";v="8", "Chromium";v="108", "Google Chrome";v="108"',
//     };

//     // TikTokApi.state.defaultApiHeaders.cookie = cookie
//     // TikTokApi.state.defaultHeaders.cookie = cookie

//     const usr = await TikTokApi.user.info('_nvtaaa.a')
//     console.log(usr);
//     const data = await TikTokApi.user.videos(usr.userInfo.id, usr.userInfo.secUid, 30, 0)

//     console.log(data);
//     // TikTokApi.user.videos('MS4wLjABAAAAHYX7r5EzjxLQ7whZLAwpscERO7k4L18xgWqt0ShUj29dsupS6eH8LtCVWPVPDOzP', '0', '0').then(x => console.log(x))
// })();


async function getDownloadLink(id) {
    const res = await axios.get('https://api16-normal-c-useast2a.tiktokv.com/aweme/v1/feed/?aweme_id=' + id, { headers })
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