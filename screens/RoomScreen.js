import React, { useState, useEffect } from "react";
import { View, TextInput, Button, Alert } from "react-native";
import * as SecureStore from "expo-secure-store";
import { io } from "socket.io-client";

const socket = io("http://192.168.29.16:3000"); // Replace with your server URL

export default function RoomScreen({ setScreen, screens, setUserId }) {
  const [localUserId, setLocalUserId] = useState("");
  const [recipientId, setRecipientId] = useState("");

  useEffect(() => {
    loadUserId();
  }, []);

  const loadUserId = async () => {
    const storedUserId = await SecureStore.getItemAsync("userId");
    if (storedUserId) {
      setLocalUserId(storedUserId);
      setUserId(storedUserId);
      registerUser(storedUserId);
    }
  };

  const registerUser = async (id) => {
    const userIdToRegister = id || localUserId;
    if (userIdToRegister) {
      await SecureStore.setItemAsync("userId", userIdToRegister);
      setUserId(userIdToRegister);
      socket.emit("register", userIdToRegister);
      Alert.alert("Success", `Registered with User ID: ${userIdToRegister}`);
    } else {
      Alert.alert("Error", "Please enter a User ID");
    }
  };

  const initiateCall = () => {
    if (recipientId) {
      socket.emit("call-user", { callerId: localUserId, recipientId });
      setScreen(screens.CALL);
    } else {
      Alert.alert("Error", "Please enter a Recipient ID");
    }
  };

  return (
    <View className="flex-1 justify-center items-center">
      <TextInput
        placeholder="Your User ID"
        value={localUserId}
        onChangeText={setLocalUserId}
        className="border border-gray-300 p-2 mb-4 w-80"
      />
      <Button title="Register User ID" onPress={() => registerUser()} />

      <TextInput
        placeholder="Recipient User ID"
        value={recipientId}
        onChangeText={setRecipientId}
        className="border border-gray-300 p-2 my-4 w-80"
      />
      <Button title="Initiate Call" onPress={initiateCall} />
    </View>
  );
}
