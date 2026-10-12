import { useQuery } from "@tanstack/react-query";

export default function Home() {
  const { data } = useQuery({
    queryKey: ["test"],
    queryFn: async () => {
      const res = await fetch("123");
      return await res.json();
    },
  });
  return <p>{data}</p>;
}
