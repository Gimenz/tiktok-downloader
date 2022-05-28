const { Downloader, formatK, searchUser, getVideoList, getDownloadLink } = require('./handler');
const fs = require('fs');
const inquirer = require('inquirer');
const chalk = require('chalk');

(async () => {
    console.clear();
    console.log('[+]', chalk.hex('#6DD5FA')('TikTok Profile All Videos Downloader'), chalk.hex('#78ffd6')('[Without Watermark]'));
    console.log('[+]', chalk.hex('#a8ff78')('Coded by masgimenz © 2022'));
    console.log('[+]', '[ github.com/Gimenz ] |', chalk.hex('#4286f4')('[ fb.me/mg.ezpz ]\n'));

    let correct = false
    while (!correct) {
        const username = await inquirer
            .prompt([{
                name: 'username',
                message: 'Type username : '
            },])
            .then(answers => {
                return answers.username;
            });

        const searchUsername = await searchUser(username)
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
            chalk.hex('#78ffd6')(`Username : @${selected.user_info.unique_id}\nNickname : ${selected.user_info.nickname}\nBio : ${selected.user_info.signature}\n` +
                `Followers : ${formatK(selected.user_info.follower_count)}\nFollowing : ${formatK(selected.user_info.following_count)}\n`)
        )

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
            let videoIds = []
            correct = true
            console.log('Scraping All Video IDs');
            let minCursor = 0
            let maxCursor = 0
            let done = false
            while (!done) {
                const videoList = await getVideoList(selected.user_info.uid, 30, minCursor, maxCursor)
                console.log('hasMore :', videoList.hasMore);
                maxCursor = videoList.maxCursor
                done = !videoList.hasMore
                for (let i = 1; i < videoList.itemListData.length; i++) {
                    videoIds.push({
                        index: i,
                        id: videoList.itemListData[i].itemInfos.id
                    })
                }
            }

            if (done) {
                console.log(`\nFound ${videoIds.length} videos from @${selected.user_info.unique_id}\n`);
                console.log('Start Downloading All Videos\n');

                let foldername = `@${selected.user_info.unique_id}`

                let dl = new Downloader(foldername)
                await dl.downloadFiles(videoIds)
            }
        }

    }
})()