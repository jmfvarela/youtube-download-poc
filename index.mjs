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
//downloadVideo("https://www.youtube.com/watch?v=l4vyyIu6r8g");
//downloadPlaylist("PLpEsvqK-KhCv9DTtuFZFPdvtzQjpt1_UW");
//downloadVideosByChannel("UCNmQim1VX0mtyRH8Oe7bSSA");

async function downloadPlaylist(playlistId) {
    const youtubeAPI = `https://www.googleapis.com/youtube/v3/playlistItems?key=${keys.API_KEY}&part=snippet&maxResults=50`;

    request(`${youtubeAPI}&playlistId=${playlistId}`, { json: true }, async (err, res, body) => {
        if (err) { return console.log(err); }
        const videoIds = body.items.map(item => item.snippet.resourceId.videoId);
        for (let videoId of videoIds) {
          await downloadVideo(videoId);
        }
    });
}

async function downloadVideosByChannel(channelId) {
    const youtubeAPI = `https://www.googleapis.com/youtube/v3/search?key=${keys.API_KEY}&part=snippet,id&order=date&maxResults=50`;

    request(`${youtubeAPI}&channelId=${channelId}`, { json: true }, async (err, res, body) => {
        if (err) { return console.log(err); }
        const videoIds = body.items.map(item => item.id.videoId).filter(id => id!==undefined);
        for (let videoId of videoIds) {
          await downloadVideo(videoId);
        }
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
                console.log(`${info.title} (${info.video_id}) - ${info.author.name} (${info.author.id})`);
                const title = encodeTitle(`${info.title}-${info.video_id}`);
        
                // Convert to mp3
                if (ONLY_AUDIO) ffmpeg(stream).audioBitrate(128).save(`downloaded/${title}.mp3`);
        
                // Save to mp4
                else stream.pipe(fs.createWriteStream(`downloaded/${title}.mp4`));
            })
            .on("progress", (chunkByteLength, totalBytesDownloaded, totalBytes) => {
                readline.cursorTo(process.stdout, 0);
                process.stdout.write(`  ${ Math.round(totalBytesDownloaded/totalBytes*100) }% of ${Math.round(totalBytes/1024/8)} KB downloaded`);
            })
            .on("end", () => {
                console.log(`\nDone: ${(Date.now() - start) / 1000}s`);
                resolve();
            });
    });
}

function encodeTitle(title) {
    let result = title.replace(/[\s]/g, "_");
    result = result.replace(/[^a-zA-Z\d_-]/g, "");
    return result;
}