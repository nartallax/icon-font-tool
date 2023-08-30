# Icon font tool

A tool to work with icon fonts.  
Very far from "swiss army knife of icon tools"; more like "a tool that fits just my exact needs".

## Install

```bash
npm install --save-dev @nartallax/icon-font-tool
```

## Use

Full list of options is available at

```bash
./node_modules/.bin/icon-font-tool --help
```

...but here's an example:

```bash
./node_modules/.bin/icon-font-tool \
	--svg-dir ./icons \
	--font-path target/my_icon_font \
	--ts-path target/icon_font.ts \
	--css-path target/icon_font_style.css
```

Command above will:

1. take all SVGs in `./icons` directory;
2. Make a `woff2` font out of it (there's option to control formats) and put it in `./target/my_icon_font.woff2`;
3. Generate CSS file with classes related to icons and put that CSS file at `./target/icon_font_style.css`;
4. Generate TS file that will import CSS file and export const enum with all the icons.

As you can see, this tool expects that your build process supports CSS importing. The idea behind all of those steps is that you can just import icons from TS file and let builder do all the work regarding delivery of the fonts/styles.  

If your CSS file ends with `.module.css`, then TS file will look a bit different - instead of const enum, it will export an object under the same name. That's not as optimal as const enum, but will work the same way, and if you want names of the icons to be mangled - you can go that route.  
