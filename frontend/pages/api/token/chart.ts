import db from "prisma/index";
import { getPrice } from "utils";
import type { Trade } from "@prisma/client";
import type { NextApiRequest, NextApiResponse } from "next";

export default async function handler(
  req: NextApiRequest,
  res: NextApiResponse
) {
  // Collect token address
  const { address }: { address: string } = req.body;
  if (!address) return res.status(400).json({ error: "Missing token address" });

  try {
    // Get all trades by token address
    const trades: Trade[] = await db.trade.findMany({
      orderBy: {
        timestamp: "asc",
      },
      where: {
        subjectAddress: address.toLowerCase(),
      },
    });

    // Generate cumulative data
    let supply = 0;
    let data: { timestamp: Date; "Price (ETH)": number }[] = [];
    for (const trade of trades) {
      // Modify amounts
      if (trade.isBuy) supply += trade.amount;
      else supply -= trade.amount;

      // Calculate new price for 1 token given supply change
      const price = getPrice(supply, 1);
      const fees = price * 0.1;

      // Add new plot data
      data.push({
        timestamp: new Date(trade.timestamp * 1000),
        "Price (ETH)": price - fees,
      });
    }

    return res.status(200).json({ data });
  } catch (e: unknown) {
    // Catch errors
    if (e instanceof Error) {
      return res.status(500).json({ message: e.message });
    }

    // Return default error
    return res.status(500).json({ message: "Internal server error" });
  }
}