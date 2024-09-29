import React, { useState, useEffect } from "react";
import { View } from "react-native";
import {
  RTCPeerConnection,
  RTCView,
  mediaDevices,
  RTCIceCandidate,
  RTCSessionDescription,
  MediaStream,
} from "react-native-webrtc";
import { db } from "../firebase";
import {
  collection,
  doc,
  setDoc,
  getDoc,
  updateDoc,
  onSnapshot,
  addDoc,
} from "firebase/firestore";
import CallActionBox from "../components/CallActionBox";

const configuration = {
  iceServers: [
    {
      urls: ["stun:stun1.l.google.com:19302", "stun:stun2.l.google.com:19302"],
    },
  ],
  iceCandidatePoolSize: 10,
};

export default function JoinScreen({
  localUserId,
  remoteUserId,
  setScreen,
  screens,
}) {
  const [localStream, setLocalStream] = useState(null);
  const [remoteStream, setRemoteStream] = useState(null);
  const [cachedLocalPC, setCachedLocalPC] = useState(null);
  const [isMuted, setIsMuted] = useState(false);
  const [isOffCam, setIsOffCam] = useState(false);

  useEffect(() => {
    startLocalStream();
  }, []);

  useEffect(() => {
    if (localStream) {
      initiateCall(localUserId, remoteUserId);
    }
  }, [localStream]);

  async function endCall() {
    if (cachedLocalPC) {
      const senders = cachedLocalPC.getSenders();
      senders.forEach((sender) => cachedLocalPC.removeTrack(sender));
      cachedLocalPC.close();
    }

    setLocalStream(null);
    setRemoteStream(null);
    setCachedLocalPC(null);
    setScreen(screens.ROOM);
  }

  const startLocalStream = async () => {
    const constraints = {
      audio: true,
      video: {
        mandatory: {
          minWidth: 500,
          minHeight: 300,
          minFrameRate: 30,
        },
        facingMode: "user",
      },
    };
    const newStream = await mediaDevices.getUserMedia(constraints);
    setLocalStream(newStream);
  };

  const initiateCall = async (localUserId, remoteUserId) => {
    const localPC = new RTCPeerConnection(configuration);
    localStream.getTracks().forEach((track) => {
      localPC.addTrack(track, localStream);
    });

    const localUserRef = doc(db, "users", localUserId);
    const remoteUserRef = doc(db, "users", remoteUserId);
    const callerCandidatesCollection = collection(
      localUserRef,
      "callerCandidates"
    );
    const calleeCandidatesCollection = collection(
      remoteUserRef,
      "calleeCandidates"
    );

    localPC.onicecandidate = (e) => {
      if (e.candidate) {
        addDoc(calleeCandidatesCollection, e.candidate.toJSON());
      }
    };

    localPC.ontrack = (e) => {
      const newStream = new MediaStream();
      e.streams[0].getTracks().forEach((track) => newStream.addTrack(track));
      setRemoteStream(newStream);
    };

    const remoteUserSnapshot = await getDoc(remoteUserRef);
    if (remoteUserSnapshot.exists()) {
      const offer = remoteUserSnapshot.data().offer;
      if (offer) {
        await localPC.setRemoteDescription(new RTCSessionDescription(offer));

        const answer = await localPC.createAnswer();
        await localPC.setLocalDescription(answer);

        await setDoc(remoteUserRef, { answer }, { merge: true });
      }
    } else {
      const offer = await localPC.createOffer();
      await localPC.setLocalDescription(offer);
      await setDoc(localUserRef, { offer }, { merge: true });
    }

    setCachedLocalPC(localPC);
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
    <View className="flex-1 bg-red-600">
      {!remoteStream && (
        <RTCView
          className="flex-1"
          streamURL={localStream && localStream.toURL()}
          objectFit={"cover"}
        />
      )}

      {remoteStream && (
        <>
          <RTCView
            className="flex-1"
            streamURL={remoteStream && remoteStream.toURL()}
            objectFit={"cover"}
          />
          {!isOffCam && (
            <RTCView
              className="w-32 h-48 absolute right-6 top-8"
              streamURL={localStream && localStream.toURL()}
            />
          )}
        </>
      )}
      <View className="absolute bottom-0 w-full">
        <CallActionBox
          switchCamera={switchCamera}
          toggleMute={toggleMute}
          toggleCamera={toggleCamera}
          endCall={endCall}
        />
      </View>
    </View>
  );
}
