﻿using System.Collections;
using System.Collections.Generic;
using UnityEngine;

//Stores data about loaded music files and sfx files
public static class LoadedFilesData
{
    // Start is called before the first frame update
    public static List<string> musicClips = new List<string>();
    public static Dictionary<string, AudioClip> sfxClips = new Dictionary<string, AudioClip>();
}
