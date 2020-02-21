﻿using System.Collections;
using System.Collections.Generic;
using UnityEngine;
using System.IO;
using TMPro;
using UnityEngine.UI;
using System;
using System.Linq;
using NLayer;
using NVorbis;

//Controls the playing of songs in the playlist
public class MusicController : MonoBehaviour
{

    private MainAppController mac;
    public AudioSource aSource;

    public GameObject listItemPrefab;
    public GameObject musicScrollView;

    public TMP_Text nowPlayingLabel;
    private Image prevButtonImage = null;
    private string songPath = "";
    internal int buttonID = -1;

    private float musicVolume = 1f;
    private float masterVolume = 1f;

    public Slider localVolumeSlider;
    public Slider playbackScrubber;

    private bool isPaused = false;
    public TMP_Text localVolumeLabel;

    internal List<GameObject> musicButtons;
    public GameObject musicButtonContentPanel;
    public Image musicStatusImage;
    public TMP_Text playbackTimerText;
    public Image shuffleImage;
    private bool shuffle;

    private VolumeController vc;

    private List<string> playedSongs;
    private bool autoCheckForNewFiles = true;

    MpegFile mp3Stream;
    VorbisReader vorbisStream;

    public float MusicVolume
    {
        get
        {
            return musicVolume;
        }

        set
        {
            ChangeLocalVolume(value);
            musicVolume = value;
        }
    }

    public float MasterVolume
    {
        get
        {
            return masterVolume;
        }
        set
        {
            vc.VolumeChanged(value);
            masterVolume = value;
        }
    }
    public bool AutoCheckForNewFiles
    {
        get
        {
            return autoCheckForNewFiles;
        }

        set
        {
            autoCheckForNewFiles = value;
        }
    }

    public bool Shuffle {
        get
        {
            return shuffle;
        }
        set
        {
            shuffle = value;
            if (shuffle) shuffleImage.color = ResourceManager.green;
            else shuffleImage.color = ResourceManager.transWhite;
        }
    }

    // Start is called before the first frame update
    void Start()
    {
        vc = GetComponent<VolumeController>();
        playedSongs = new List<string>();
        musicButtons = new List<GameObject>();
        mac = Camera.main.GetComponent<MainAppController>();
        StartCoroutine("CheckForNewFiles");
        localVolumeSlider.onValueChanged.AddListener(ChangeLocalVolume);

        playbackScrubber.onValueChanged.AddListener(PlaybackTimeValueChanged);
    }

    internal void InitLoadFiles(List<string> files)
    {
        foreach (string s in files)
        {
            if (!LoadedFilesData.musicClips.Contains(s))
            {
                //Debug.Log(s);
                LoadedFilesData.musicClips.Add(s);
                GameObject listItem = Instantiate(listItemPrefab, musicScrollView.transform);
                listItem.GetComponentInChildren<TMP_Text>().text = s.Replace(mac.musicDirectory + mac.sep, "");
                listItem.GetComponent<MusicButton>().id = LoadedFilesData.musicClips.Count - 1;
                listItem.GetComponent<MusicButton>().file = s;
                musicButtons.Add(listItem);
            }
        }
    }




    IEnumerator CheckForNewFiles()
    {
        while(true)
        {
            if (autoCheckForNewFiles)
            {
                foreach (string s in System.IO.Directory.GetFiles(mac.musicDirectory))
                {
                    if (!LoadedFilesData.musicClips.Contains(s) && (Path.GetExtension(s) == ".mp3" || Path.GetExtension(s) == ".ogg"))
                    {
                        LoadedFilesData.musicClips.Add(s);
                        GameObject listItem = Instantiate(listItemPrefab, musicScrollView.transform);
                        listItem.GetComponentInChildren<TMP_Text>().text = s.Replace(mac.musicDirectory + mac.sep, "");
                        listItem.GetComponent<MusicButton>().id = LoadedFilesData.musicClips.Count - 1;
                        listItem.GetComponent<MusicButton>().file = s;
                        musicButtons.Add(listItem);
                    }
                }
                List<GameObject> toDelete = new List<GameObject>();
                foreach (string s in LoadedFilesData.musicClips)
                {
                    string[] files = System.IO.Directory.GetFiles(mac.musicDirectory);
                    if (!files.Contains(s))
                    {
                        toDelete.Add(musicButtons[LoadedFilesData.musicClips.IndexOf(s)]);
                    }
                }
                foreach (GameObject g in toDelete)
                {
                    LoadedFilesData.musicClips.RemoveAt(g.GetComponent<MusicButton>().id);
                    Destroy(g);

                }
            }
            yield return new WaitForSeconds(1);
        }
    }

    public void ItemSelected(int id)
    {
        buttonID = id;
        if (musicButtons.Count > 0)
        {
            try
            {
                MusicButton button = musicButtons[buttonID].GetComponent<MusicButton>();
                songPath = button.file;
                AudioClip clip = null;
                long totalLength = 0;

                if (Path.GetExtension(songPath) == ".mp3")
                {
                    vorbisStream = null;
                    mp3Stream = new MpegFile(songPath);
                    //
                    totalLength = mp3Stream.Length / (mp3Stream.Channels * 4);
                    Debug.Log(mp3Stream.Length > int.MaxValue);
                    if (totalLength > int.MaxValue) totalLength = int.MaxValue;
                    clip = AudioClip.Create(songPath, (int)totalLength, mp3Stream.Channels, mp3Stream.SampleRate, true, MP3Callback);
                    aSource.clip = clip;
                    SetupInterfaceForPlay();
                }
                else if(Path.GetExtension(songPath) == ".ogg")
                {
                    mp3Stream = null;
                    vorbisStream = new NVorbis.VorbisReader(songPath);
                    totalLength = vorbisStream.TotalSamples;
                    if (totalLength > int.MaxValue) totalLength = int.MaxValue;
                    clip = AudioClip.Create(songPath, (int)totalLength, vorbisStream.Channels, vorbisStream.SampleRate, true, VorbisCallback);
                    aSource.clip = clip;
                    SetupInterfaceForPlay();
                }
                else
                {
                    aSource.clip = null;
                }

            }
            catch (IndexOutOfRangeException e)
            {
                //Debug.Log(e.Message);
                mac.ShowErrorMessage("Encoding Type Invalid: 0. " + e.Message);
            }
            catch (ArgumentException e)
            {
                //Debug.Log(e.Message);
                mac.ShowErrorMessage("Encoding Type Invalid: 1. " + e.Message);
            }
            catch (Exception e)
            {
                //Debug.Log(e.Message);
                mac.ShowErrorMessage("Unknown exception: 2. " + e.Message);
            }
        }
    }

    void SetupInterfaceForPlay()
    {
        
        aSource.time = 0;
        aSource.Play();
        playbackScrubber.value = 0;
        Image buttonImage = musicButtons[buttonID].GetComponent<Image>();
        if (prevButtonImage != null) prevButtonImage.color = ResourceManager.grey;
        buttonImage.color = ResourceManager.red;

        int itemID = LoadedFilesData.musicClips.IndexOf(songPath);
        if (playedSongs.Count > 0)
        {
            if (songPath != playedSongs[playedSongs.Count - 1]) playedSongs.Add(songPath);
        }
        else playedSongs.Add(songPath);

        prevButtonImage = buttonImage;
        //Debug.Log(channels);
        nowPlayingLabel.text = songPath.Replace(mac.musicDirectory + mac.sep, "");
        musicStatusImage.sprite = ResourceManager.playImage;
    }

    void MP3Callback(float[] data)
    {
        try
        {
            mp3Stream.ReadSamples(data, 0, data.Length);
        }
        catch(NullReferenceException e)
        {
            Stop();
        }
    }

    void VorbisCallback(float[] data)
    {
        vorbisStream.ReadSamples(data, 0, data.Length);
    }

    public void Next()
    {
        if(shuffle)
        {
            int newButtonID = UnityEngine.Random.Range(0, LoadedFilesData.musicClips.Count);
            while(buttonID == newButtonID)
            {
                newButtonID = UnityEngine.Random.Range(0, LoadedFilesData.musicClips.Count);
            }
            buttonID = newButtonID;
            ItemSelected(buttonID);
        }
        else
        {
            if (buttonID == musicButtons.Count - 1)
            {
                buttonID = 0;
                ItemSelected(0);
            }
            else
            {
                buttonID++;
                ItemSelected(buttonID);
            }

        }
        playbackScrubber.value = 0;
    }

    public void Previous()
    {
        if(musicButtons.Count > 0)
        {
            playbackScrubber.value = 0;
            if (shuffle)
            {
                if (playedSongs.Count > 1)
                {
                    foreach (GameObject mb in musicButtons)
                    {
                        if (mb.GetComponent<MusicButton>().file == playedSongs[playedSongs.Count - 2]) buttonID = mb.GetComponent<MusicButton>().id;
                    }
                    playedSongs.RemoveAt(playedSongs.Count - 1);
                    ItemSelected(buttonID);
                }
                else
                {
                    int newButtonID = UnityEngine.Random.Range(0, LoadedFilesData.musicClips.Count);
                    while (buttonID == newButtonID)
                    {
                        newButtonID = UnityEngine.Random.Range(0, LoadedFilesData.musicClips.Count);
                    }
                    buttonID = newButtonID;
                    ItemSelected(buttonID);
                }
            }

            else
            {
                if (playedSongs.Count > 1)
                {
                    foreach (GameObject mb in musicButtons)
                    {
                        if (mb.GetComponent<MusicButton>().file == playedSongs[playedSongs.Count - 2]) buttonID = mb.GetComponent<MusicButton>().id;
                    }
                    playedSongs.RemoveAt(playedSongs.Count - 1);
                    ItemSelected(buttonID);

                }
                else
                {
                    if (buttonID > 0)
                    {
                        buttonID--;
                        ItemSelected(buttonID);
                        playedSongs.RemoveAt(playedSongs.Count - 1);
                    }
                    else
                    {
                        buttonID = musicButtons.Count - 1;
                        ItemSelected(buttonID);
                        playedSongs.RemoveAt(playedSongs.Count - 1);
                    }
                }
            }
        }
    }

    public void Stop()
    {
        aSource.Stop();
        isPaused = false;
        aSource.clip = null;
        if (prevButtonImage != null) prevButtonImage.color = ResourceManager.grey;
        if(mp3Stream != null) mp3Stream.Dispose();
        if (vorbisStream != null) vorbisStream.Dispose();
        musicStatusImage.sprite = ResourceManager.stopImage;
        nowPlayingLabel.text = "";
    }

    public void Pause()
    {
        aSource.Pause();
        isPaused = true;
        if (prevButtonImage != null) prevButtonImage.color = ResourceManager.orange;
        musicStatusImage.sprite = ResourceManager.pauseImage;
    }

    public void Play()
    {
        if(aSource.clip != null)
        {
            aSource.UnPause();
            isPaused = false;
            if (prevButtonImage != null) prevButtonImage.color = ResourceManager.red;
            musicStatusImage.sprite = ResourceManager.playImage;
        }
        else if(shuffle)
        {
            buttonID = UnityEngine.Random.Range(0, LoadedFilesData.musicClips.Count - 1);
            ItemSelected(buttonID);
        }
        else ItemSelected(0);
    }

    public void RefreshSongOrder(int oldID, int newID)
    {
        musicButtons[oldID].GetComponent<MusicButton>().id = newID;
        musicButtons[newID].GetComponent<MusicButton>().id = oldID;
        GameObject item = musicButtons[oldID];
        musicButtons.Remove(item);
        musicButtons.Insert(newID, item);
    }

    public void ChangeMasterVolume(float newMasterVolume)
    {
        masterVolume = newMasterVolume;
        aSource.volume = masterVolume * musicVolume;
    }

    private void ChangeLocalVolume(float newLocalVolume)
    {
        if (localVolumeSlider.value != newLocalVolume) localVolumeSlider.value = newLocalVolume;
        musicVolume = newLocalVolume;
        aSource.volume = masterVolume * musicVolume;
        localVolumeLabel.text = (musicVolume * 100).ToString("N0");
    }

    private void PlaybackTimeValueChanged(float val)
    {
        if(aSource.clip != null)
        {
            try
            {
                if (Mathf.Abs(val - (aSource.time / aSource.clip.length)) > 0.01)
                {
                    if (mp3Stream != null) mp3Stream.Position = Convert.ToInt64(mp3Stream.Length * val);
                    else if (vorbisStream != null) vorbisStream.DecodedPosition = Convert.ToInt64(vorbisStream.TotalSamples * val);
                    aSource.time = val * aSource.clip.length;
                }
            }
            catch(NullReferenceException e)
            {
            }
        }
    }

    // Update is called once per frame
    void Update()
    {
        if(!aSource.isPlaying && aSource.clip != null && !isPaused)
        {
            prevButtonImage.color = ResourceManager.grey;
            if (buttonID < musicButtons.Count - 1)
            {
                int newbuttonID = shuffle ? UnityEngine.Random.Range(0, musicButtons.Count - 1) : buttonID + 1;
                while (newbuttonID == buttonID)
                {
                    newbuttonID = shuffle ? UnityEngine.Random.Range(0, musicButtons.Count - 1) : 0;
                }
                buttonID = newbuttonID;
                ItemSelected(buttonID);
            }
            else
            {

                int newbuttonID = shuffle ? UnityEngine.Random.Range(0, musicButtons.Count - 1) : 0;
                while(newbuttonID == buttonID)
                {
                    newbuttonID = shuffle ? UnityEngine.Random.Range(0, musicButtons.Count - 1) : 0;
                }
                buttonID = newbuttonID;
                ItemSelected(buttonID);
            }

        }
        if(aSource.clip != null)
        {
            playbackScrubber.value = aSource.time / aSource.clip.length;
            playbackTimerText.text = Mathf.Floor(aSource.time / 60).ToString() + ":" + (Mathf.FloorToInt(aSource.time % 60)).ToString("D2") + "/" + Mathf.FloorToInt(aSource.clip.length / 60) + ":" + Mathf.FloorToInt(aSource.clip.length % 60).ToString("D2");
        }
    }
}
