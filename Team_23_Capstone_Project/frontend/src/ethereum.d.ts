interface Ethereum {
  request: (args: { method: string }) => Promise<string[]>;
}

interface Window {
  ethereum?: Ethereum;
}
