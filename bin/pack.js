#!/usr/bin/env node

const archiver = require('archiver');
const prettyBytes = require('pretty-bytes');
const os = require('os');
const path = require('path');
const fs = require('fs-extra');
const program = require('commander');
const glob = require('glob');
const moment = require('moment');
const D2U = require('@dpwolfe/dos2unix').dos2unix;
process.title = "pack";

var packFile = path.resolve(process.cwd(), "package.json");
console.log(`work directory: ${process.cwd()}`);
if (!fs.existsSync(packFile)) {
    console.log('package.json not found.')
    process.exit();
}
const package = require(packFile);
var buildTime = moment().format('YYMMDDHHmm');
var archiveName = `${package.name}-${package.version}-${buildTime}`;
archiveName = archiveName.replace(/\//g,"-");

function doArchive(format = 'zip') {
    if(fs.existsSync(path.resolve(process.cwd(), "bin/node"))) {
        console.log('copy node bin...');
        fs.copySync(path.resolve(process.cwd(), "bin/node"), path.resolve(process.cwd(), "node_modules/.bin/node"));
        console.log('copy node bin done');
    }   
    if(fs.existsSync(path.resolve(process.cwd(), "bin/node.exe"))) {
        console.log('copy node.exe bin...');
        fs.copySync(path.resolve(process.cwd(), "bin/node.exe"), path.resolve(process.cwd(), "node_modules/.bin/node.exe"));
        console.log('copy node.exe bin done');
    }  
    
    //dos2unix
    var dos2unix = new D2U({ glob: { cwd: __dirname } });
    dos2unix.process(package.dos2unix || ['*.sh']);

    switch (format) {
        case 'zip':
            var output = fs.createWriteStream(path.resolve(process.cwd(), `${archiveName}.zip`));
            var archive = archiver('zip', { zlib: { level: 9 } })
            break;
        case 'tar':
            var output = fs.createWriteStream(path.resolve(process.cwd(), `${archiveName}.tar.gz`));
            var archive = archiver('tar', { gzip: true });
            break;
        default:
            console.log('unknow format');
            program.help();
            break;
    }
    output.on('close', function () {
        console.log(os.EOL + prettyBytes(archive.pointer()) + ' total bytes');
    });
    archive.on('warning', function (err) {
        if (err.code === 'ENOENT') {
            console.log(err);
        } else {
            throw err;
        }
    }).on('error', function (err) {
        throw err;
    }).on('progress', data => {
        process.stdout.clearLine();
        process.stdout.cursorTo(0);
        process.stdout.write(`${prettyBytes(data.fs.processedBytes)} / ${prettyBytes(data.fs.totalBytes)}`);
    })

    archive.pipe(output);
    var globs = [];
    globs = globs.concat(package.pack || []);
    if(!globs.length) {
        globs.push({
            pattern: "**",
            options: {
                dot: false,
                ignore: ["node_modules{,/**}", "*.log", "*.tar.gz", "*.zip"]
            }
        })
    }
    for(var _glob of globs) {
        archive.glob(_glob.pattern, Object.assign({
            cwd: process.cwd()
        }, _glob.options), {
            prefix: archiveName
        })
    }
    console.log(`do ${format} ...`);
    archive.finalize();
}

program.version(require(path.resolve(__dirname, "../package.json")).version)
    // .option('-F, --format [tar,zip]', 'archive format [tar]', 'tar')

program.command('clean').description('clean *.zip,*.tar.gz').action(function () {
    var files = glob.sync("{*.zip,*.tar.gz}", {
        cwd: process.cwd(),
        dot: true,
        absolute: true
    })
    for (file of files) {
        console.log(`remove file [${file}]`);
        fs.removeSync(file);
    }
    fs.removeSync(path.resolve(process.cwd(), "node_modules/.bin/node"));
    fs.removeSync(path.resolve(process.cwd(), "node_modules/.bin/node.exe"));
    console.log('clean done.');
    process.exit();
})

program.command('zip').description('make zip archive').action(function() {
    doArchive('zip');
})

program.command('tar').description('make tar archive').action(function() {
    doArchive('tar');
})

program.command('*', {
    noHelp: true
}).action(function () {
    program.outputHelp();
})

program.parse(process.argv);

if(program.args.length == 0) {
    program.help();
}



