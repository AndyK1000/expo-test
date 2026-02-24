import { supabase } from "@/lib/supabase";
import * as Location from "expo-location";
import { Accelerometer, Gyroscope } from "expo-sensors";
import { useEffect, useRef, useState } from "react";
import { StyleSheet, Text, TouchableOpacity, View } from "react-native";

const MAX_DELTA_MS = 50;
const CHUNK_SIZE = 100;

type LocationSnapshot = {
  latitude: number;
  longitude: number;
  altitude: number;
  location_timestamp: number;
  location_accuracy: number | null;
};

function pairReadings(accels: any[], gyros: any[], location: LocationSnapshot) {
  return accels.reduce((pairs: any[], a) => {
    const closest = gyros.reduce((best, g) =>
      Math.abs(g.timestamp - a.timestamp) <
      Math.abs(best.timestamp - a.timestamp)
        ? g
        : best,
    );
    if (Math.abs(closest.timestamp - a.timestamp) <= MAX_DELTA_MS) {
      pairs.push({
        accel_x: a.x,
        accel_y: a.y,
        accel_z: a.z,
        accel_timestamp: a.timestamp,
        gyro_x: closest.x,
        gyro_y: closest.y,
        gyro_z: closest.z,
        gyro_timestamp: closest.timestamp,
        latitude: location.latitude,
        longitude: location.longitude,
        altitude: location.altitude,
        location_timestamp: location.location_timestamp,
        location_accuracy: location.location_accuracy,
      });
    }
    return pairs;
  }, []);
}

export default function App() {
  const [{ x, y, z }, setData] = useState({ x: 0, y: 0, z: 0 });
  const [{ x: gx, y: gy, z: gz }, setGyroData] = useState({ x: 0, y: 0, z: 0 });
  const [permissionDenied, setPermissionDenied] = useState(false);

  const [subscription, setSubscription] = useState(null);
  const [gyroSubscription, setGyroSubscription] = useState(null);
  const locationSubRef = useRef<Location.LocationSubscription | null>(null);

  const accelRef = useRef<any[]>([]);
  const gyroRef = useRef<any[]>([]);
  const latestLocationRef = useRef<LocationSnapshot | null>(null);

  function maybeFlush() {
    if (!latestLocationRef.current) return;
    if (
      accelRef.current.length > CHUNK_SIZE &&
      gyroRef.current.length > CHUNK_SIZE
    ) {
      const pairs = pairReadings(
        accelRef.current,
        gyroRef.current,
        latestLocationRef.current,
      );
      accelRef.current = [];
      gyroRef.current = [];
      if (pairs.length > 0) {
        (async () => {
          const { error } = await supabase.from("data").insert(pairs);
          if (error) console.error(error);
        })();
      }
    }
  }

  const _subscribe = () => {
    const sub = Accelerometer.addListener((event) => {
      accelRef.current.push({
        x: event.x,
        y: event.y,
        z: event.z,
        timestamp: event.timestamp,
      });
      setData(event);
      maybeFlush();
    });
    setSubscription(sub);
  };

  const _unsubscribe = () => {
    subscription && subscription.remove();
    setSubscription(null);
  };

  const _subscribeGyro = () => {
    const sub = Gyroscope.addListener((event) => {
      gyroRef.current.push({
        x: event.x,
        y: event.y,
        z: event.z,
        timestamp: event.timestamp,
      });
      setGyroData(event);
      maybeFlush();
    });
    setGyroSubscription(sub);
  };

  const _unsubscribeGyro = () => {
    gyroSubscription && gyroSubscription.remove();
    setGyroSubscription(null);
  };

  const _subscribeLocation = async () => {
    locationSubRef.current = await Location.watchPositionAsync(
      {
        accuracy: Location.Accuracy.High,
        timeInterval: 1000,
        distanceInterval: 0,
      },
      (location) => {
        latestLocationRef.current = {
          latitude: location.coords.latitude,
          longitude: location.coords.longitude,
          altitude: location.coords.altitude ?? 0,
          location_timestamp: location.timestamp,
          location_accuracy: location.coords.accuracy ?? null,
        };
      },
    );
  };

  const _unsubscribeLocation = () => {
    locationSubRef.current?.remove();
    locationSubRef.current = null;
  };

  const _slow = () => {
    Accelerometer.setUpdateInterval(1000);
    Gyroscope.setUpdateInterval(1000);
  };

  const _fast = () => {
    Accelerometer.setUpdateInterval(16);
    Gyroscope.setUpdateInterval(16);
  };

  const _toggleAll = () => {
    if (subscription) {
      _unsubscribe();
      _unsubscribeGyro();
    } else {
      _subscribe();
      _subscribeGyro();
    }
  };

  useEffect(() => {
    (async () => {
      const { status } = await Location.requestForegroundPermissionsAsync();
      if (status !== "granted") {
        setPermissionDenied(true);
        return;
      }

      await _subscribeLocation();
      _subscribe();
      _subscribeGyro();
    })();

    return () => {
      _unsubscribe();
      _unsubscribeGyro();
      _unsubscribeLocation();
      if (latestLocationRef.current) {
        const remaining = pairReadings(
          accelRef.current,
          gyroRef.current,
          latestLocationRef.current,
        );
        if (remaining.length > 0) {
          supabase.from("data").insert(remaining);
        }
      }
      accelRef.current = [];
      gyroRef.current = [];
    };
  }, []);

  if (permissionDenied) {
    return (
      <View style={styles.container}>
        <Text style={styles.deniedTitle}>Location Access Required</Text>
        <Text style={styles.deniedBody}>
          This screen requires location permission to record data. Please enable
          it in your device settings.
        </Text>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <Text style={styles.header}>Accelerometer</Text>
      <Text style={styles.unit}>(gs, where 1g = 9.81 m/s²)</Text>
      <Text style={styles.text}>x: {x.toFixed(4)}</Text>
      <Text style={styles.text}>y: {y.toFixed(4)}</Text>
      <Text style={styles.text}>z: {z.toFixed(4)}</Text>

      <Text style={[styles.header, styles.sectionSpacing]}>Gyroscope</Text>
      <Text style={styles.unit}>(rad/s)</Text>
      <Text style={styles.text}>x: {gx.toFixed(4)}</Text>
      <Text style={styles.text}>y: {gy.toFixed(4)}</Text>
      <Text style={styles.text}>z: {gz.toFixed(4)}</Text>

      <Text style={[styles.header, styles.sectionSpacing]}>Location</Text>
      <Text style={styles.unit}>(degrees / metres)</Text>
      <Text style={styles.text}>
        lat: {latestLocationRef.current?.latitude.toFixed(6) ?? "waiting..."}
      </Text>
      <Text style={styles.text}>
        lng: {latestLocationRef.current?.longitude.toFixed(6) ?? "waiting..."}
      </Text>
      <Text style={styles.text}>
        alt: {latestLocationRef.current?.altitude.toFixed(1) ?? "waiting..."}
      </Text>

      <View style={styles.buttonContainer}>
        <TouchableOpacity onPress={_toggleAll} style={styles.button}>
          <Text>{subscription ? "On" : "Off"}</Text>
        </TouchableOpacity>
        <TouchableOpacity
          onPress={_slow}
          style={[styles.button, styles.middleButton]}
        >
          <Text>Slow</Text>
        </TouchableOpacity>
        <TouchableOpacity onPress={_fast} style={styles.button}>
          <Text>Fast</Text>
        </TouchableOpacity>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    justifyContent: "center",
    paddingHorizontal: 20,
  },
  header: {
    textAlign: "center",
    fontWeight: "600",
    fontSize: 16,
  },
  unit: {
    textAlign: "center",
    fontSize: 12,
    color: "#888",
    marginBottom: 4,
  },
  sectionSpacing: {
    marginTop: 24,
  },
  text: {
    textAlign: "center",
  },
  deniedTitle: {
    textAlign: "center",
    fontWeight: "600",
    fontSize: 16,
    marginBottom: 12,
  },
  deniedBody: {
    textAlign: "center",
    color: "#666",
    lineHeight: 22,
  },
  buttonContainer: {
    flexDirection: "row",
    alignItems: "stretch",
    marginTop: 24,
  },
  button: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    backgroundColor: "#eee",
    padding: 10,
  },
  middleButton: {
    borderLeftWidth: 1,
    borderRightWidth: 1,
    borderColor: "#ccc",
  },
});
