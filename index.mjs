import ytdl from 'ytdl-core';
import fs from 'fs';
import readline from 'readline';
import ffmpegInst from '@ffmpeg-installer/ffmpeg';
import ffmpeg from 'fluent-ffmpeg';
ffmpeg.setFfmpegPath(ffmpegInst.path);
import request from 'request';
import keys from './keys';

const ONLY_AUDIO = true;

// SMOKE TESTS
// Clear English Corner with Keenyn Rhodes - Welcome to Clear English Corner!
//downloadVideo("https://www.youtube.com/watch?v=l4vyyIu6r8g");
// Clear English Corner with Keenyn Rhodes - Connected Speech, Linking & Reductions
//downloadPlaylist("PLpEsvqK-KhCv9DTtuFZFPdvtzQjpt1_UW"); 
// Clear English Corner with Keenyn Rhodes
//downloadVideosByChannel("UCNmQim1VX0mtyRH8Oe7bSSA"); 
// Speak Confident English
//downloadVideosByChannel("UCEFLuo9AR7268-qJj1FkmSw"); 
// Speak English With Vanessa
downloadVideosByChannel("UCxJGMJbjokfnr2-s4_RXPxQ");

let num = 1;

async function downloadPlaylist(playlistId, pageToken) {
    let youtubeAPI = `https://www.googleapis.com/youtube/v3/playlistItems?key=${keys.API_KEY}&part=snippet&maxResults=50`;
    if (pageToken) youtubeAPI += `&pageToken=${pageToken}`;

    request(`${youtubeAPI}&playlistId=${playlistId}`, { json: true }, async (err, res, body) => {
        if (err) { return console.log(err); }
        const nextPageToken = body.nextPageToken;
        const videoIds = body.items.map(item => item.snippet.resourceId.videoId);
        for (let videoId of videoIds) {
            await downloadVideo(videoId);
        }
        if (nextPageToken) await downloadPlaylist(playlistId, nextPageToken);
    });
}

async function downloadVideosByChannel(channelId, pageToken) {
    let youtubeAPI = `https://www.googleapis.com/youtube/v3/search?key=${keys.API_KEY}&part=snippet,id&order=date&maxResults=50`;
    if (pageToken) youtubeAPI += `&pageToken=${pageToken}`;

    request(`${youtubeAPI}&channelId=${channelId}`, { json: true }, async (err, res, body) => {
        if (err) { return console.log(err); }
        const nextPageToken = body.nextPageToken;
        const videoIds = body.items.map(item => item.id.videoId).filter(id => id!==undefined);
        for (let videoId of videoIds) {
            await downloadVideo(videoId);
        }
        if (nextPageToken) await downloadVideosByChannel(channelId, nextPageToken);
    });
}

async function downloadVideo(videoUrl) {
    return new Promise((resolve, reject) => {
        const start = Date.now();
        
        const stream = ytdl(videoUrl, {
                // Add when working with https sites
                // Perhaps you need too: npm config set strict-ssl false
                requestOptions: {
                    rejectUnauthorized: false,
                    requestCert: false,
                    agent: false,
                }
            })
            .on("info", (info, format) => {
                console.log(`\n${num}: ${info.title} (${info.video_id}) - ${info.author.name} (${info.author.id})`);
                num += 1;
                const title = encodeTitle(`${info.title}-${info.video_id}`);

                // Convert to mp3
                if (ONLY_AUDIO && !fs.existsSync(`downloaded/${title}.mp3`)) {
                    ffmpeg(stream).audioBitrate(192).save(`downloaded/${title}.mp3`);
                }
        
                // Save to mp4
                else if (!ONLY_AUDIO && !fs.existsSync(`downloaded/${title}.mp4`)) {
                    stream.pipe(fs.createWriteStream(`downloaded/${title}.mp4`));
                }
                else {
                    console.log(`  File exists`);
                    resolve();
                }
            })
            .on("progress", (chunkByteLength, totalBytesDownloaded, totalBytes) => {
                readline.cursorTo(process.stdout, 0);
                process.stdout.write(`  ${ Math.round(totalBytesDownloaded/totalBytes*100) }% downloaded`);
            })
            .on("end", () => {
                console.log(`\nDone: ${(Date.now() - start) / 1000}s`);
                resolve();
            })
            .on("error", (error) => {
                console.error(`\nERROR: ${error}`);
                resolve();
            });
    });
}

function encodeTitle(title) {
    let result = title.replace(/[\s]/g, "_");
    result = result.replace(/[^a-zA-Z\d_-]/g, "");
    return result;
}
