﻿using System.Collections;
using System.Collections.Generic;
using UnityEngine;
using System;
using UnityEditor;
using System.Linq;
using UnityEngine.UI;
using System.IO;
using TMPro;


//Main controller for the app. Handles various tasks
public class MainAppController : MonoBehaviour
{
    internal const int NUMPAGES = 7;
    internal const int NUMBUTTONS = 35;
    internal const string VERSION = "v0.83";

    internal string mainDirectory;
    internal string musicDirectory;
    internal string sfxDirectory;
    internal string saveDirectory;
    internal char sep;

    internal int activePage = 0;

    public PageParent[] pageParents;
    public GameObject sfxButtonPrefab;

    public List<GameObject> pageButtons;

    public List<List<GameObject>> sfxButtons;
    private MusicController mc;
    private EditPageLabel epl;

    public GameObject optionsPanel;

    public GameObject errorMessagesPanel;
    public GameObject errorPrefab;

    public GameObject setupPanel;
    public Button keepButton;
    public Button changeButton;

    public TMP_Text mainText;

    private Color stopColor;
    // Start is called before the first frame update
    public void Start()
    {
        //Screen.fullScreen = false;
        //Screen.SetResolution(800, 500, false);
        //PlayerPrefs.SetInt("setupComplete", 0);

        sfxButtons = new List<List<GameObject>>();
        epl = GetComponent<EditPageLabel>();
        pageParents = GameObject.FindObjectsOfType<PageParent>();
        mc = GetComponent<MusicController>();

        sep = System.IO.Path.DirectorySeparatorChar;


        MakeSFXButtons();


        pageParents[0].gameObject.transform.SetSiblingIndex(NUMPAGES);

        ResourceManager.pauseImage = Resources.Load<Sprite>("pause");
        ResourceManager.stopImage = Resources.Load<Sprite>("stop");
        ResourceManager.playImage = Resources.Load<Sprite>("play");

        if (PlayerPrefs.GetInt("setupComplete") == 0)
        {
            setupPanel.SetActive(true);
            keepButton.onClick.AddListener(KeepDirectory);
            changeButton.onClick.AddListener(ChangeDirectory);

            string directory = System.IO.Path.Combine(System.Environment.GetFolderPath(System.Environment.SpecialFolder.MyMusic), "TableTopAudio");
            mainText.text = "The default directory for new saves will be " + directory + ". Would you like to keep or change this directory? This can be changed at any time from the options menu.";
        }

        else
        {
            mainDirectory = PlayerPrefs.GetString("defaultSaveDirectory");
            musicDirectory = Path.Combine(mainDirectory, "music");
            sfxDirectory = Path.Combine(mainDirectory, "sound effects");
            saveDirectory = Path.Combine(mainDirectory, "saves");

            SetupFolderStructure(mainDirectory);
        }

    }

    void KeepDirectory()
    {
        PlayerPrefs.SetInt("setupComplete", 1);
        mainDirectory = System.IO.Path.Combine(System.Environment.GetFolderPath(System.Environment.SpecialFolder.MyMusic), "TableTopAudio");
        musicDirectory = Path.Combine(mainDirectory, "music");
        sfxDirectory = Path.Combine(mainDirectory, "sound effects");
        saveDirectory = Path.Combine(mainDirectory, "saves");

        PlayerPrefs.SetString("defaultSaveDirectory", mainDirectory);
        mc.AutoCheckForNewFiles = true;
        setupPanel.SetActive(false);
    }

    void ChangeDirectory()
    {
        //PlayerPrefs.SetInt("setupComplete", 1);
        GetComponent<OptionsMenuController>().ShowRootSelectionMenu(true);
        setupPanel.SetActive(false);
    }

    internal void SetupFolderStructure(string directory)
    {
        if (!System.IO.Directory.Exists(mainDirectory))
        {
            System.IO.Directory.CreateDirectory(mainDirectory);
        }
        if (!System.IO.Directory.Exists(musicDirectory))
        {
            System.IO.Directory.CreateDirectory(musicDirectory);
        }
        if (!System.IO.Directory.Exists(sfxDirectory))
        {
            System.IO.Directory.CreateDirectory(sfxDirectory);
        }
        if (!System.IO.Directory.Exists(saveDirectory))
        {
            System.IO.Directory.CreateDirectory(saveDirectory);
        }
        mc.AutoCheckForNewFiles = true;
    }

    internal bool MakeSFXButtons()
    {
        sfxButtons.Clear();
        for (int i = 0; i < NUMPAGES; i++)
        {
            sfxButtons.Add(new List<GameObject>());
            for (int j = 0; j < NUMBUTTONS; j++)
            {
                GameObject button = Instantiate(sfxButtonPrefab, pageParents[i].transform);
                SFXButton btn = button.GetComponent<SFXButton>();
                btn.id = j;
                btn.page = i;
                sfxButtons[i].Add(button);
            }
        }
        return true;
    }

    internal bool ControlButtonClicked(string id)
    {
        switch (id)
        {
            case "STOP-SFX":
                foreach (List<GameObject> page in sfxButtons)
                {
                    foreach (GameObject obj in page)
                    {
                        obj.GetComponent<SFXButton>().Stop();
                    }
                }
                break;                
            case "OPTIONS":
                optionsPanel.SetActive(true);
                break;
            case "STOP-MUSIC":
                mc.Stop();
                break;
            case "PAUSE-MUSIC":
                mc.Pause();
                break;
            case "PLAY-MUSIC":
                mc.Play();
                break;
            case "SHUFFLE":
                mc.Shuffle = !mc.Shuffle;
                break;
            case "NEXT":
                mc.Next();
                break;
            case "PREVIOUS":
                mc.Previous();
                break;
        }
        return true;
    }

    internal void ChangeSFXPage(int pageID)
    {
        pageParents[pageID].gameObject.transform.SetSiblingIndex(NUMPAGES);
        activePage = pageID;
    }

    internal void EditPageLabel(TMP_Text label)
    {
        epl.buttonLabel = label;
        epl.StartEditing();
    }

    internal void ShowErrorMessage(string message)
    {
        GameObject error = Instantiate(errorPrefab, errorMessagesPanel.transform);
        error.GetComponentInChildren<TMP_Text>().text = "Error: " + message;
    }

}
