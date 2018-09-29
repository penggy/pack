# @penggy/pack

pack your nodejs project

把你的 `nodejs` 工程打成压缩文件, 通过配置, 可以控制最终生成的压缩文件中是否包含 `node_modules` 目录

## install

```shell
npm i -g @penggy/pack
```

## usage

```shell
  Usage: pack [options] [command]

  Options:

    -V, --version  output the version number
    -h, --help     output usage information

  Commands:

    clean          clean *.zip,*.tar.gz
    zip            make zip archive
    tar            make tar archive

```

## config

pack 命令从当前工作目录找 package.json 文件, 根据 package.json 配置内容, 生成压缩文件.

默认情况下, 打包除 node_moudle, *.log, *.tar.gz, *.zip 以外的所有文件(非点字符打头), 对应的 glob 配置如下:

```js
{
    "pattern": "**",
    "options": {
      "dot": false,
      "ignore": ["node_modules/**", "*.log", "*.tar.gz", "*.zip"]
    }    
}
```

如果默认配置不满足你的要求, 你也可以在 package.json 文件中自定义打包规则, 如:

```js
  "pack": {
    "name": "xxx",
    "path": "build",
    "pattern": "**",
    "options": {
      "dot": false,
      "ignore": ["*.log", "*.tar.gz", "*.zip"]
    }
  }
```

`pack` 字段还可以写成数组的形式, 以满足多条打包规则的情况

`pack` 使用 `node-glob` 匹配文件, 更多详细的匹配说明, 请参考 [node-glob github](https://github.com/isaacs/node-glob)

祝使用愉快!

