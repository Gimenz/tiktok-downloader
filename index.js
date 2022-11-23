const { Downloader, formatK, searchUser, getVideoList, getDownloadLink } = require('./handler');
const fs = require('fs');
const inquirer = require('inquirer');
const chalk = require('chalk');
const { default: axios } = require('axios');

if (!fs.existsSync('cookie')) return console.log(chalk.red('[Error]'), 'Cookie Not FOund! please set cookie first');
if (fs.readFileSync('cookie', 'utf-8') == '') return console.log(chalk.red('[Error]'), 'Cookie Not FOund! please set cookie first');

(async () => {
    try {
        console.clear();
        console.log('[+]', chalk.hex('#6DD5FA')('TikTok Profile All Videos Downloader'), chalk.hex('#78ffd6')('[Without Watermark]'));
        console.log('[+]', chalk.hex('#a8ff78')('Coded by masgimenz © 2022'));
        console.log('[+]', '[ github.com/Gimenz ] |', chalk.hex('#4286f4')('[ fb.me/mg.ezpz ]\n'));

        let correct = false
        while (!correct) {
            const username = await inquirer
                .prompt([{
                    name: 'username',
                    message: 'Type a username/name : '
                },])
                .then(answers => {
                    return answers.username;
                });

            const searchUsername = await searchUser(username)
            // console.log(searchUsername[0]);
            let listusername = searchUsername.map(x => `${x.user_info.nickname} | @${x.user_info.unique_id}`)
            listusername.push('CANCEL')

            let select = await inquirer.
                prompt([{
                    type: 'rawlist',
                    choices: listusername,
                    name: 'selected',
                    message: 'Which Profile ?',
                }]).then(answers => {
                    return answers.selected
                })

            if (select == 'CANCEL') return console.log('[CANCELED]');
            const selected = searchUsername[listusername.indexOf(select)]

            console.log(
                `\n${chalk.hex('#56CCF2')('##### [ User Info ] #####')}\n` +
                chalk.hex('#78ffd6')(
                    `Username : @${selected.user_info.unique_id}\n` +
                    `Nickname : ${selected.user_info.nickname}\n` +
                    `Post : ${selected.user_info.aweme_count}\n` +
                    `Private : ${selected.user_info.secret == 1 ? true : false}\n` +
                    `Bio : ${selected.user_info.signature}\n` +
                    `Followers : ${formatK(selected.user_info.follower_count)}\n` +
                    `Following : ${formatK(selected.user_info.following_count)}\n`)
            )

            // return console.log(selected.user_info);

            const validate = await inquirer
                .prompt([{
                    type: 'confirm',
                    name: 'value',
                    message: 'is the data correct?',
                }])
                .then(answers => {
                    return answers.value
                })

            if (validate) {
                correct = true
                let videoIds = []
                console.log('Scraping All Video IDs');
                let cursor = 0
                let index = 1
                let done = false
                while (!done) {
                    const videoList = await getVideoList(selected.user_info.sec_uid, 30, cursor)
                    if (videoList !== undefined) {
                        const hasMore = videoList.hasMore
                        console.log('hasMore :', hasMore, '|', videoList.itemList.length, 'videos');
                        cursor = videoList.cursor
                        done = !hasMore
                        for (let i = 0; i < videoList.itemList.length; i++) {
                            videoIds.push({
                                index: index,
                                id: videoList.itemList[i].video.id
                            })
                            index++
                        }
                    }
                }

                if (done) {

                    if (videoIds.length == 0) return console.log('No videos found!');
                    console.log(`\nFound ${videoIds.length} videos from @${selected.user_info.unique_id}\n`);
                    console.log('Start Downloading All Videos\n');

                    let foldername = `@${selected.user_info.unique_id}`
                    if (!fs.existsSync('download')) fs.mkdirSync('download')
                    if (!fs.existsSync(`download/${foldername}`)) {
                        fs.mkdirSync(`download/${foldername}`)
                    }

                    const getProfilePicture = await axios.get(selected.user_info.avatar_larger.url_list[1], { responseType: 'arraybuffer' })
                    fs.writeFileSync(`./download/${foldername}/@${selected.user_info.unique_id}_profilePic.jpeg`, getProfilePicture.data)
                    fs.writeFileSync(`./download/${foldername}/@${selected.user_info.unique_id}_info.json`, JSON.stringify(selected, null, 2))

                    let dl = new Downloader(foldername)
                    await dl.downloadFiles(videoIds)

                }
            }

        }
    } catch (error) {
        console.log(error);
    }
})()