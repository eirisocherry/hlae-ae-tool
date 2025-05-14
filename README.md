# HLAE AE Tool
After Effects script that allows you to:  
- Import HLAE Clips  
- Setup EXR Depth  
- Import camera (.cam)  


## Installation
1. Download the script: https://github.com/eirisocherry/hlae-ae-tool/releases  
2. Move `HLAE_AE_TOOL` folder and `HLAE_AE_TOOL.jsx` script to:  
`C:\Program Files\Adobe\Adobe After Effects <version>\Support Files\Scripts\ScriptUI Panels`  
2.1. [Optional] Edit `HLAE_AE_TOOL.jsx` and adjust the variables (read manual for more info)  
![image](https://github.com/user-attachments/assets/4a65d935-b477-4ebf-a7ad-2138f0c1d93e)  
3. Restart After Effects  
4. Go to `Window`, scroll down and open `HLAE_AE_TOOL.jsx`  
5. Dock the script panel  


## Manual

<details>
<summary> Import HLAE Clips </summary>
<br>

### Usage
1. Press the button
2. Select any clip from a take folder  
3. Done

### Logic behind the button
1. Create "HLAE Clips" ae project folder if it doesn't exist  
2. Create <cinematic_name> ae project folder and move it inside "HLAE Clips" ae project folder  
3. Get info about all the files from selected folder  
4. Import files (video, audios)  
![image](https://github.com/user-attachments/assets/89f085e5-e43f-4f87-8705-eea4413c4389)  
5. If video has one of the following names, remember its framerate  
![image](https://github.com/user-attachments/assets/cd939230-2982-40ae-b1e3-3e009d01ae88)  
6. Import image sequences  
6.1. Change image sequence framerate to framerate of the main clip  
6.2. If main clip is not found, change image sequence framerate to  
![image](https://github.com/user-attachments/assets/c439e7ce-e5bc-4053-a2c4-dc287afff014)  
7. Move all files inside <cinematic_folder> ae project folder  
8. Precompose the <cinematic_folder> ae project folder  
9. Invert layer order (so layers are placed in alphabetical order)  
10. Hide all layers except the first one at the top (to improve perfomance)  

<br>
</details>



<details>
<summary> Setup EXR Depth </summary>
<br>

### Usage
1. Select 6depthEXR sequence
2. Press the button
3. Done

### Logic behind the button
1. Add `EXtractoR` effect  
- Set `Z` channel  
- Set `Black Point` to `25000`  
- Set `White Point` to `0`  
2. Add `Levels` effect  
- Set `Clamp to Output Black` to `On`  
- Set `Clamp to Output White` to `On`  
It clamps rgb values of the depth to [0-1] range, that fixes blending mode issues  
3. Precomp 6depthEXR sequence  

<br>
</details>



<details>
<summary> Import Camera (.cam) </summary>
<br>

### Usage
1. Press the button  
2. Choose .cam file  
3. Done  

### Differences from the [official camera importer (.cam)](https://github.com/xNWP/HLAE-CamIO-To-AE/releases)  
- Automatically sets hold keyframes, so tracking stays accurate even when you use time remapping  
- No errors when running the script through window tab  
- More alerts that help to avoid mistakes  

<br>
</details>



## Support
Author: https://www.youtube.com/@shy_rikki  
My support discord server: https://discord.gg/AAJxThhbBf  
