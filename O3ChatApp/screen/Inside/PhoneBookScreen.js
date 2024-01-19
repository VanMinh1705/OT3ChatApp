import { StyleSheet, Text, View } from "react-native";
import React from "react";

const PhoneBookScreen = () => {
  return (
    <View style={{ flex: 1, alignItems: "center", justifyContent: "center" }}>
      <Text
        onPress={() => navigation.navigate("Home")}
        style={{ fontSize: 26, fontWeight: "bold" }}
      >
        Trang danh bạ
      </Text>
    </View>
  );
};

export default PhoneBookScreen;

const styles = StyleSheet.create({});
