import React from "react";
import { View, StyleSheet } from "react-native";
import { createBottomTabNavigator } from "@react-navigation/bottom-tabs";
import { createNativeStackNavigator } from "@react-navigation/native-stack";
import { getFocusedRouteNameFromRoute } from "@react-navigation/native";
import { MapScreen } from "../../screens/Map/MapScreen";
import { HistoryScreen } from "../../screens/History/HistoryScreen";
import { HistoryDetailScreen } from "../../screens/History/HistoryDetailScreen";
import { SettingsScreen } from "../../screens/Settings/SettingsScreen";
import { ProfileScreen } from "../../screens/Profile/ProfileScreen";
import { ParkingSummaryScreen } from "../../screens/Parking/ParkingSummaryScreen";
import { FloatingTabBar } from "../../navigation/FloatingTabBar";
import { t } from "../../localization";

const Tab = createBottomTabNavigator();
const HistoryStack = createNativeStackNavigator();
const MapStack = createNativeStackNavigator();
const ProfileStack = createNativeStackNavigator();

const noHeaderOptions = {
  headerShown: false,
};

function MapStackNavigator() {
  return (
    <MapStack.Navigator screenOptions={noHeaderOptions}>
      <MapStack.Screen name="MapMain" component={MapScreen} />
      <MapStack.Screen name="ParkingSummary" component={ParkingSummaryScreen} />
    </MapStack.Navigator>
  );
}

function HistoryStackNavigator() {
  return (
    <HistoryStack.Navigator screenOptions={noHeaderOptions}>
      <HistoryStack.Screen name="HistoryMain" component={HistoryScreen} />
      <HistoryStack.Screen name="HistoryDetail" component={HistoryDetailScreen} />
    </HistoryStack.Navigator>
  );
}

function ProfileStackNavigator() {
  return (
    <ProfileStack.Navigator screenOptions={noHeaderOptions}>
      <ProfileStack.Screen name="ProfileMain" component={ProfileScreen} />
      <ProfileStack.Screen name="SettingsMain" component={SettingsScreen} />
    </ProfileStack.Navigator>
  );
}

function CustomTabBar({ state, navigation }: any) {
  const currentRoute = state.routes[state.index].name;
  const currentRouteState = state.routes[state.index].state;
  
  let focusedRouteName: string | undefined;
  if (currentRouteState) {
    focusedRouteName = getFocusedRouteNameFromRoute({
      params: currentRouteState.params,
      name: currentRoute,
      state: currentRouteState,
    });
  }

  const shouldHideTabBar =
    focusedRouteName === "HistoryDetail" ||
    focusedRouteName === "ParkingSummary" ||
    focusedRouteName === "SettingsMain";

  if (shouldHideTabBar) {
    return null;
  }

  const activeTab = currentRouteState?.index !== undefined
    ? currentRoute
    : currentRoute;

  return (
    <FloatingTabBar
      tabs={[
        { name: "Map", label: t("map.title") },
        { name: "History", label: t("history.title") },
        { name: "Profile", label: t("profile.title") },
      ]}
      activeTab={activeTab}
      onTabPress={(tabName) => {
        const route = state.routes.find((r: any) => r.name === tabName);
        if (route) {
          if (tabName === "History") {
            navigation.navigate(tabName, { screen: "HistoryMain" });
          } else if (tabName === "Map") {
            navigation.navigate(tabName, { screen: "MapMain" });
          } else if (tabName === "Profile") {
            navigation.navigate(tabName, { screen: "ProfileMain" });
          } else {
            navigation.navigate(route.name);
          }
        }
      }}
    />
  );
}

export const MainNavigator: React.FC = () => {
  return (
    <View style={styles.container}>
      <Tab.Navigator
        screenOptions={{
          headerShown: false,
        }}
        tabBar={(props) => <CustomTabBar {...props} />}
      >
        <Tab.Screen name="Map" component={MapStackNavigator} />
        <Tab.Screen name="History" component={HistoryStackNavigator} />
        <Tab.Screen name="Profile" component={ProfileStackNavigator} />
      </Tab.Navigator>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
});

