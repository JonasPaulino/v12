import { useEffect, useState } from "react";
import { getDashboard } from "./api";

export const useDashboard = () => {
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let mounted = true;

    const load = async () => {
      try {
        const response = await getDashboard();
        if (mounted) {
          setData(response.data || null);
        }
      } finally {
        if (mounted) {
          setLoading(false);
        }
      }
    };

    load();

    return () => {
      mounted = false;
    };
  }, []);

  return {
    data,
    loading,
  };
};
