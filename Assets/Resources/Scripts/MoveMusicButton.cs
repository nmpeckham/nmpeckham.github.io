﻿using System.Collections;
using System.Collections.Generic;
using UnityEngine;
using UnityEngine.EventSystems;
using UnityEngine.UI;

//Controls the reordering of songs in the playlist
public class MoveMusicButton : MonoBehaviour, IPointerDownHandler, IPointerUpHandler
{
    private Vector3 mousePos;
    private static int buttonWithMouse = -1;
    private GameObject musicButton;
    private RectTransform buttonRectTransform;
    private Transform buttonTransform;
    private MusicController mc;
    // Start is called before the first frame update
    void Start()
    {
        musicButton = GetComponentInParent<MusicButton>().gameObject;
        buttonRectTransform = musicButton.GetComponent<RectTransform>();
        buttonTransform = musicButton.transform;
        mc = Camera.main.GetComponent<MusicController>();
    }

    // Update is called once per frame
    void Update()
    {
        if (buttonWithMouse == buttonTransform.GetSiblingIndex() && Input.GetMouseButton(0))
        {

            if ((Input.mousePosition.y - mousePos.y) > buttonRectTransform.rect.height)
            {
                //mb.id--;
                if ((buttonTransform.GetSiblingIndex() - 1) >= 0)
                {
                    mc.RefreshSongOrder(buttonTransform.GetSiblingIndex(), buttonTransform.GetSiblingIndex() - 1);
                    buttonTransform.SetSiblingIndex(buttonTransform.GetSiblingIndex() - 1);
                    buttonWithMouse--;
                    mousePos = Input.mousePosition;
                    mc.buttonID -= 1;
                }
                
            }
            if ((Input.mousePosition.y - mousePos.y) < -buttonRectTransform.rect.height)
            {
                //mb.id++;
                if ((buttonTransform.GetSiblingIndex() + 1) <= buttonTransform.parent.childCount - 1)
                {
                    int newIndex = buttonTransform.GetSiblingIndex() + 1;
                    //Debug.Log(newIndex);
                    mc.RefreshSongOrder(buttonTransform.GetSiblingIndex(), newIndex);
                    buttonTransform.SetSiblingIndex(newIndex);
                    buttonWithMouse++;
                    mousePos = Input.mousePosition;
                    mc.buttonID += 1;
                }

            }

        }
    }

    public void OnPointerDown(PointerEventData eventData)
    {
        mousePos = Input.mousePosition;
        buttonWithMouse = buttonTransform.GetSiblingIndex();
    }

    public void OnPointerUp(PointerEventData eventData)
    {
        buttonWithMouse = -1;
    }
}
