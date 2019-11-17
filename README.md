Work in progress !  

# checkcertif_addon

Firefox's addon  
  
[See the main project](https://github.com/Oros42/checkcertif)  

## Build

To build the firefox's addon :  
```
./buid.sh
```

## Install
  
### Development version
  
In Firefox, go to [about:config](about:config) and set ```xpinstall.signatures.required``` to ```false```.  
If you whan to debug : got to ```about:debugging#/runtime/this-firefox``` and load the addon.  
If you whan to only use it : got to ```about:addons```, and install from file.  
