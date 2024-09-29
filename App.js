import React, { useEffect, useRef, useState } from "react";
import { View, Button, Text, TextInput, StyleSheet } from "react-native";
import { initializeApp } from "firebase/app";
import { getDatabase, ref, onValue, set, remove } from "firebase/database";
import {
  RTCPeerConnection,
  RTCView,
  mediaDevices,
  RTCSessionDescription,
} from "react-native-webrtc";

// Initialize Firebase
const firebaseConfig = {
  apiKey: "AIzaSyAbzUhLgsrVhewJ_0dws0xdYedXRFcWIrE",
  authDomain: "example-53d49.firebaseapp.com",
  databaseURL: "https://example-53d49-default-rtdb.firebaseio.com/",
  projectId: "example-53d49",
  storageBucket: "example-53d49.appspot.com",
  messagingSenderId: "266292868410",
  appId: "1:266292868410:web:15f10cd9f5c974fa954c03",
  measurementId: "G-LPK0J8Z6ZV",
};

// Initialize Firebase
const app = initializeApp(firebaseConfig);
const db = getDatabase(app);

const App = () => {
  const [localStream, setLocalStream] = useState(null);
  const [remoteStream, setRemoteStream] = useState(null);
  const [incomingCall, setIncomingCall] = useState(false);
  const [userId, setUserId] = useState("");
  const [callerUserId, setCallerUserId] = useState("");
  const peerConnection = useRef(new RTCPeerConnection({ iceServers: [] }));

  useEffect(() => {
    const getUserMedia = async () => {
      try {
        const stream = await mediaDevices.getUserMedia({
          video: true,
          audio: true,
        });
        setLocalStream(stream);
        stream
          .getTracks()
          .forEach((track) => peerConnection.current.addTrack(track, stream));
      } catch (error) {
        console.error("Error accessing media devices.", error);
      }
    };

    getUserMedia();

    // Listen for signaling messages
    const callRef = ref(db, "calls/");
    onValue(callRef, (snapshot) => {
      const data = snapshot.val();
      if (data && data[userId]) {
        const callData = data[userId];
        if (callData.offer) {
          handleIncomingCall(callData);
        }
      }
    });

    return () => {
      remove(callRef);
    };
  }, [userId]);

  const handleIncomingCall = async (callData) => {
    console.log("Incoming call from:", callData.from);
    setIncomingCall(true);
    setCallerUserId(callData.from);
    await peerConnection.current.setRemoteDescription(
      new RTCSessionDescription(callData.offer)
    );
  };

  const startCall = async (to) => {
    const offer = await peerConnection.current.createOffer();
    await peerConnection.current.setLocalDescription(offer);

    // Save call data to Firebase
    set(ref(db, `calls/${to}`), {
      offer: offer,
      from: userId,
    });
  };

  const acceptCall = async () => {
    setIncomingCall(false);
    const answer = await peerConnection.current.createAnswer();
    await peerConnection.current.setLocalDescription(answer);

    // Save answer to Firebase
    set(ref(db, `calls/${callerUserId}`), {
      answer: answer,
      from: userId,
    });
  };

  const declineCall = () => {
    setIncomingCall(false);
    remove(ref(db, `calls/${callerUserId}`));
  };

  return (
    <View style={styles.container}>
      {localStream && (
        <RTCView style={styles.localVideo} streamURL={localStream.toURL()} />
      )}
      {remoteStream && (
        <RTCView style={styles.remoteVideo} streamURL={remoteStream.toURL()} />
      )}
      {incomingCall && (
        <View style={styles.callContainer}>
          <Text>Incoming Call from {callerUserId}</Text>
          <Button title="Accept" onPress={acceptCall} />
          <Button title="Decline" onPress={declineCall} />
        </View>
      )}
      <TextInput
        style={styles.input}
        placeholder="Enter Your User ID"
        value={userId}
        onChangeText={setUserId}
      />
      <TextInput
        style={styles.input}
        placeholder="Enter Caller User ID"
        value={callerUserId}
        onChangeText={setCallerUserId}
      />
      <Button title="Start Call" onPress={() => startCall(callerUserId)} />
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    justifyContent: "center",
    width: "100%",
    alignItems: "center",
  },
  localVideo: {
    width: "100%",
    height: "40%",
  },
  remoteVideo: {
    width: "100%",
    height: "40%",
    position: "absolute",
    top: 0,
  },
  callContainer: {
    position: "absolute",
    top: "10%",
    left: "50%",
    transform: [{ translateX: -50 }, { translateY: -50 }],
    backgroundColor: "rgba(255, 255, 255, 0.8)",
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
