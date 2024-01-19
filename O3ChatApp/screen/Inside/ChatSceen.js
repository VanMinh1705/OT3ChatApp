import { SafeAreaView, StyleSheet, Text, View } from "react-native";
import React from "react";

const ChatSceen = () => {
  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.header}></View>
      <Text
        onPress={() => alert('This is the "Home" screen.')}
        style={{ fontSize: 26, fontWeight: "bold" }}
      >
        Home Screen
      </Text>
    </SafeAreaView>
  );
};

export default ChatSceen;

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#fff",
  },
  header: {
    width: 375,
    height: 57,
    backgroundColor: "#03c6fc",
  },
});
