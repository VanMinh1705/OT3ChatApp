import { StyleSheet, Text, View } from "react-native";
import React from "react";
import { createBottomTabNavigator } from "@react-navigation/bottom-tabs";
import Icon from "react-native-vector-icons/AntDesign";
import ChatSceen from "./ChatSceen";
import PhoneBookScreen from "./PhoneBookScreen";
import PersonalScreen from "./PersonalScreen";

const Tab = createBottomTabNavigator();

const HomeScreen = ({ route }) => {
  const { user } = route.params;

  return (
    <Tab.Navigator
      initialRouteName="ChatSceen"
      screenOptions={{ headerShown: false, tabBarActiveTintColor: "#0059ff" }}
    >
      <Tab.Screen
        options={{
          tabBarLabel: "Tin Nhắn",
          tabBarIcon: ({ color, size }) => (
            <Icon size={size} name="wechat" color={color} />
          ),
        }}
        name="ChatSceen"
        component={ChatSceen}
      />
      <Tab.Screen
        options={{
          tabBarLabel: "Danh Bạ",
          tabBarIcon: ({ color, size }) => (
            <Icon size={size} name="contacts" color={color} />
          ),
        }}
        name="PhoneBookScreen"
        component={PhoneBookScreen}
      />
      <Tab.Screen
        options={{
          tabBarLabel: "Cá Nhân",
          tabBarIcon: ({ color, size }) => (
            <Icon size={size} name="user" color={color} />
          ),
        }}
        name="PersonalScreen"
      >
        {() => <PersonalScreen user={user} />}
      </Tab.Screen>
    </Tab.Navigator>
  );
};

export default HomeScreen;

const styles = StyleSheet.create({});
