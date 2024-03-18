const { Downloader, formatK, searchUser, getVideoList, getDownloadLink } = require('./handler');
const fs = require('fs');
const inquirer = require('inquirer');
const chalk = require('chalk');

if (!fs.existsSync('cookie')) return console.log(chalk.redBright('[WARNING]'), 'Cookie Not FOund! please set cookie first');

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
                    `@${selected.user_info.unique_id} | ${selected.user_info.nickname}\n` +
                    `Followers : ${formatK(selected.user_info.follower_count)}\n`
                )
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
                let postCount = 0;
                console.log('Scraping All Video IDs');
                let cursor = 0
                let done = false
                while (!done) {
                    const videoList = await getVideoList(selected.user_info.sec_uid, 30, cursor)
                    if (videoList !== undefined) {
                        const hasMore = videoList.hasMore
                        cursor = videoList.cursor
                        postCount = postCount + videoList.itemList.length
                        console.log('hasMore :', hasMore, '|', videoList.itemList.length, 'post', cursor);
                        done = !hasMore
                        for (let i = 0; i < videoList.itemList.length; i++) {
                            if (videoList.itemList[i]?.imagePost) {
                                videoList.itemList[i]?.imagePost?.images.forEach((val, idx) => {
                                    videoIds.push({
                                        index: i + 1,
                                        type: 'image',
                                        id: videoList.itemList[i].id,
                                        img_index: idx + 1,
                                        img_url: val.imageURL.urlList[0],
                                        title: videoList.itemList[i]?.imagePost?.title || videoList.itemList[i].id
                                    })
                                })
                            } else {
                                videoIds.push({
                                    index: i + 1,
                                    type: 'video',
                                    id: videoList.itemList[i].id
                                })
                            }
                        }
                    }
                }

                if (done) {
                    if (videoIds.length == 0) return console.log('No videos found!');
                    console.log(`\nFound ${postCount} posts from @${selected.user_info.unique_id}\n`);
                    console.log('Start Downloading All Videos\n');

                    let foldername = `@${selected.user_info.unique_id}`
                    if (!fs.existsSync('download')) fs.mkdirSync('download')
                    if (!fs.existsSync(`download/${foldername}`)) {
                        fs.mkdirSync(`download/${foldername}`)
                    }

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