import React, { useState, useEffect, useRef } from "react";
import { View, Alert } from "react-native";
import {
  RTCPeerConnection,
  RTCView,
  mediaDevices,
  RTCIceCandidate,
  RTCSessionDescription,
} from "react-native-webrtc";
import { io } from "socket.io-client";
import CallActionBox from "../components/CallActionBox";
import * as SecureStore from "expo-secure-store";

const socket = io("http://192.168.29.16:3000"); // Replace with your server URL

const configuration = {
  iceServers: [
    {
      urls: ["stun:stun1.l.google.com:19302", "stun:stun2.l.google.com:19302"],
    },
  ],
};

export default function CallScreen({ setScreen, screens }) {
  const [localStream, setLocalStream] = useState(null);
  const [remoteStream, setRemoteStream] = useState(null);
  const [isMuted, setIsMuted] = useState(false);
  const [isOffCam, setIsOffCam] = useState(false);
  const [userId, setUserId] = useState("");
  const peerConnection = useRef(null);

  useEffect(() => {
    loadUserId();
    startLocalStream();
    setupSocketListeners();

    return () => {
      if (localStream) {
        localStream.getTracks().forEach((track) => track.stop());
      }
      if (peerConnection.current) {
        peerConnection.current.close();
      }
    };
  }, []);

  const loadUserId = async () => {
    const storedUserId = await SecureStore.getItemAsync("userId");
    if (storedUserId) {
      setUserId(storedUserId);
    }
  };

  const setupSocketListeners = () => {
    socket.on("incoming-call", async ({ callerId, offer }) => {
      Alert.alert("Incoming Call", `Call from ${callerId}`, [
        {
          text: "Decline",
          onPress: () => socket.emit("call-declined", { callerId }),
          style: "cancel",
        },
        {
          text: "Accept",
          onPress: () => handleIncomingCall(callerId, offer),
        },
      ]);
    });

    socket.on("call-answered", ({ answer }) => {
      handleCallAnswered(answer);
    });

    socket.on("ice-candidate", handleNewICECandidate);
  };

  const startLocalStream = async () => {
    const stream = await mediaDevices.getUserMedia({
      audio: true,
      video: true,
    });
    setLocalStream(stream);
  };

  const handleIncomingCall = async (callerId, offer) => {
    peerConnection.current = new RTCPeerConnection(configuration);
    peerConnection.current.ontrack = handleTrackEvent;
    peerConnection.current.onicecandidate = (event) => {
      if (event.candidate) {
        socket.emit("ice-candidate", {
          recipientId: callerId,
          candidate: event.candidate,
        });
      }
    };

    await peerConnection.current.setRemoteDescription(
      new RTCSessionDescription(offer)
    );

    localStream
      .getTracks()
      .forEach((track) => peerConnection.current.addTrack(track, localStream));

    const answer = await peerConnection.current.createAnswer();
    await peerConnection.current.setLocalDescription(answer);

    socket.emit("answer-call", { callerId, answer });
  };

  const handleCallAnswered = async (answer) => {
    await peerConnection.current.setRemoteDescription(
      new RTCSessionDescription(answer)
    );
  };

  const handleNewICECandidate = async (candidate) => {
    if (peerConnection.current) {
      await peerConnection.current.addIceCandidate(
        new RTCIceCandidate(candidate)
      );
    }
  };

  const handleTrackEvent = (event) => {
    setRemoteStream(event.streams[0]);
  };

  const endCall = () => {
    if (peerConnection.current) {
      peerConnection.current.close();
    }
    setLocalStream(null);
    setRemoteStream(null);
    setScreen(screens.ROOM);
  };

  const switchCamera = () => {
    localStream.getVideoTracks().forEach((track) => track._switchCamera());
  };

  const toggleMute = () => {
    localStream.getAudioTracks().forEach((track) => {
      track.enabled = !track.enabled;
      setIsMuted(!track.enabled);
    });
  };

  const toggleCamera = () => {
    localStream.getVideoTracks().forEach((track) => {
      track.enabled = !track.enabled;
      setIsOffCam(!track.enabled);
    });
  };

  return (
    <View className="flex-1 bg-black">
      {localStream && (
        <RTCView
          streamURL={localStream.toURL()}
          className="absolute top-0 right-0 w-1/3 h-1/3"
        />
      )}
      {remoteStream && (
        <RTCView streamURL={remoteStream.toURL()} className="flex-1" />
      )}
      <CallActionBox
        switchCamera={switchCamera}
        toggleMute={toggleMute}
        toggleCamera={toggleCamera}
        endCall={endCall}
      />
    </View>
  );
}
