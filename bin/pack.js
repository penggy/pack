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
const child_process = require('child_process');
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
archiveName = archiveName.replace(/\//g, "-");

function doArchive(pack = {
    name: package.name,
    format: 'zip',
    pattern: '**',
    options: {
        dot: false,
        ignore: ["node_modules{,/**}", "*.log", "*.tar.gz", "*.zip"]
    }
}) {
    if (package.scripts && package.scripts.build) {
        child_process.spawnSync("npm", ["run", "build"], {
            cwd: process.cwd(),
            shell: true,
            stdio: 'inherit'
        })
    }
    var bins = glob.sync("bin/*", {
        cwd: process.cwd(),
        absolute: true
    })
    for(var bin of bins) {
        console.log(`copy bin ${bin} ...`)
        fs.copySync(bin, path.resolve(process.cwd(), `node_modules/.bin/${path.basename(bin)}`));
    }

    //dos2unix
    var dos2unix = new D2U({ glob: { cwd: process.cwd() } });
    dos2unix.process(package.dos2unix || ["*.sh"]);

    var packPath = "";
    var packName = archiveName;
    if (pack.name) {
        packName = `${pack.name}-${package.version}-${buildTime}`;
    }
    if (pack.path) {
        if(!fs.pathExistsSync(pack.path)){
         fs.mkdirpSync(pack.path);
        }
        packPath = pack.path + path.sep;
    }
    switch (pack.format || 'zip') {
        case 'zip':
            var targetName = `${packPath}${packName}.zip`;
            var output = fs.createWriteStream(path.resolve(process.cwd(), targetName));
            var archive = archiver('zip', { zlib: { level: 9 } })
            break;
        case 'tar':
            var targetName = `${packPath}${packName}.tar.gz`;
            var output = fs.createWriteStream(path.resolve(process.cwd(), targetName));
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
        // process.stdout.clearLine();
        // process.stdout.cursorTo(0);
        // process.stdout.write(`${prettyBytes(data.fs.processedBytes)} / ${prettyBytes(data.fs.totalBytes)}`);
    })

    archive.pipe(output);
    archive.glob(pack.pattern || "**", Object.assign({
        cwd: process.cwd()
    }, pack.options || {
        dot: false,
        ignore: ["node_modules{,/**}", "*.log", "*.tar.gz", "*.zip"]
    }), {
            prefix: packName
        })
    console.log(`do ${pack.format || 'zip'} ${targetName} ...`);
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
    var packs = [];
    packs = packs.concat(package.pack || []);
    for(var pack of packs) {
        if(!pack.format) {
            pack.format = 'zip';
        }
        if(pack.format == 'zip') {
            doArchive(pack);
        }
    }
})

program.command('tar').description('make tar archive').action(function() {
    var packs = [];
    packs = packs.concat(package.pack || []);
    for(var pack of packs) {
        if(!pack.format) {
            pack.format = 'tar';
        }
        if(pack.format == 'tar') {
            doArchive(pack);
        }
    }
})

program.command('*', {
    noHelp: true
}).action(function () {
    program.outputHelp();
})

program.parse(process.argv);

if (program.args.length == 0) {
    var packs = [];
    packs = packs.concat(package.pack || []);
    for (var pack of packs) {
        doArchive(pack);
    }
}



