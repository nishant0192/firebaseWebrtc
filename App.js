import React, { useEffect, useRef, useState } from "react";
import { View, Button, Text, TextInput, StyleSheet } from "react-native";
import { RTCPeerConnection, RTCView, mediaDevices } from "react-native-webrtc";
import { initializeApp } from "firebase/app";
import {
  initializeFirestore,
  collection,
  doc,
  onSnapshot,
  setDoc,
  deleteDoc,
} from "firebase/firestore";

// Your Firebase configuration
const firebaseConfig = {
  apiKey: "AIzaSyAbzUhLgsrVhewJ_0dws0xdYedXRFcWIrE",
  authDomain: "example-53d49.firebaseapp.com",
  projectId: "example-53d49",
  storageBucket: "example-53d49.appspot.com",
  messagingSenderId: "266292868410",
  appId: "1:266292868410:web:15f10cd9f5c974fa954c03",
  measurementId: "G-LPK0J8Z6ZV",
};

const app = initializeApp(firebaseConfig);
const db = initializeFirestore(app, {
  experimentalForceLongPolling: true,
});

const App = () => {
  const [localStream, setLocalStream] = useState(null);
  const [remoteStream, setRemoteStream] = useState(null);
  const [isCallActive, setIsCallActive] = useState(false);
  const [incomingCall, setIncomingCall] = useState(false);
  const [callerSocketId, setCallerSocketId] = useState("");
  const peerConnection = useRef(new RTCPeerConnection({ iceServers: [] }));

  useEffect(() => {
    const getUserMedia = async () => {
      const stream = await mediaDevices.getUserMedia({
        video: true,
        audio: true,
      });
      setLocalStream(stream);
      stream
        .getTracks()
        .forEach((track) => peerConnection.current.addTrack(track, stream));
    };

    getUserMedia();

    const callCollection = collection(db, "calls");

    // Listen for incoming calls
    const unsubscribe = onSnapshot(callCollection, (snapshot) => {
      snapshot.docChanges().forEach((change) => {
        if (change.type === "added") {
          const data = change.doc.data();
          if (data.callStatus === "incoming") {
            setIncomingCall(true);
            setCallerSocketId(data.callerId);
            peerConnection.current.setRemoteDescription(
              new RTCSessionDescription(data.signal)
            );
          }
        } else if (change.type === "removed") {
          setIncomingCall(false);
        }
      });
    });

    peerConnection.current.ontrack = (event) => {
      setRemoteStream(event.streams[0]);
    };

    peerConnection.current.onicecandidate = (event) => {
      if (event.candidate) {
        setDoc(doc(callCollection, callerSocketId), {
          candidate: event.candidate,
          callStatus: "ongoing",
        });
      }
    };

    return () => {
      unsubscribe();
    };
  }, [callerSocketId]);

  const startCall = async (to) => {
    const offer = await peerConnection.current.createOffer();
    await peerConnection.current.setLocalDescription(offer);
    await setDoc(doc(collection(db, "calls"), to), {
      signal: offer,
      callerId: callerSocketId,
      callStatus: "incoming",
    });
  };

  const acceptCall = async () => {
    setIncomingCall(false);
    const answer = await peerConnection.current.createAnswer();
    await peerConnection.current.setLocalDescription(answer);
    await setDoc(doc(collection(db, "calls"), callerSocketId), {
      signal: answer,
      callStatus: "ongoing",
    });
  };

  const declineCall = async () => {
    setIncomingCall(false);
    await deleteDoc(doc(collection(db, "calls"), callerSocketId));
  };

  return (
    <View style={styles.container}>
      {localStream && (
        <RTCView style={styles.video} streamURL={localStream.toURL()} />
      )}
      {isCallActive && remoteStream && (
        <RTCView style={styles.video} streamURL={remoteStream.toURL()} />
      )}
      {incomingCall && (
        <View style={styles.callContainer}>
          <Text>Incoming Call</Text>
          <Button title="Accept" onPress={acceptCall} />
          <Button title="Decline" onPress={declineCall} />
        </View>
      )}
      <TextInput
        style={styles.input}
        placeholder="Enter Caller Socket ID"
        value={callerSocketId}
        onChangeText={setCallerSocketId}
      />
      <Button title="Start Call" onPress={() => startCall(callerSocketId)} />
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
  },
  video: {
    width: "100%",
    height: "80%",
  },
  callContainer: {
    position: "absolute",
    top: "40%",
    left: "50%",
    transform: [{ translateX: -50 }, { translateY: -50 }],
    backgroundColor: "white",
    padding: 20,
    borderRadius: 10,
    alignItems: "center",
    elevation: 5,
  },
  input: {
    height: 40,
    borderColor: "gray",
    borderWidth: 1,
    marginBottom: 10,
    paddingHorizontal: 10,
    width: "80%",
  },
});

export default App;
