#!/bin/bash

tmpDir="/dev/shm/checkcertif/"
outDir=$(pwd)

rm -fr $tmpDir
mkdir $tmpDir
cp -r {css,html,icons,js} $tmpDir
cp manifest.json $tmpDir
cd $tmpDir

zip -r -FS $outDir/checkCertifPlugin.xpi *

