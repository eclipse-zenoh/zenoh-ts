import {
  Config,
  Session,
  Query,
  Reply,
  Sample,
  KeyExpr,
  SampleKind,
  ReplyDelOptions,
  ZBytes,
} from "@eclipse-zenoh/zenoh-ts";
import { assertEquals } from "https://deno.land/std@0.192.0/testing/asserts.ts";

function sleep(ms: number) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

Deno.test("Basic ReplyDel Test", async () => {
  let session1: Session | undefined;
  let session2: Session | undefined;

  try {
    // Open two sessions
    session1 = await Session.open(new Config("ws/127.0.0.1:10000"));
    session2 = await Session.open(new Config("ws/127.0.0.1:10000"));
    
    await sleep(100);

    const replies: Reply[] = [];
    
    // Declare queryable
    const queryable = await session1.declareQueryable("test/replydel", {
      handler: async (query: Query) => {
        console.log("Received query, sending replyDel...");
        try {
          await query.replyDel("test/replydel", {});
          console.log("ReplyDel sent successfully");
        } catch (error) {
          console.error("ReplyDel failed:", error);
          throw error;
        }
        query.finalize();
      },
    });

    await sleep(100);

    // Send query
    await session2.get("test/replydel", {
      handler: (reply: Reply) => {
        console.log("Received reply:", reply.result());
        replies.push(reply);
      },
    });

    await sleep(200);

    console.log("Total replies received:", replies.length);
    
    if (replies.length > 0) {
      const result = replies[0].result();
      console.log("First reply type:", result.constructor.name);
      
      if (result instanceof Sample) {
        console.log("Sample kind:", result.kind());
        console.log("Sample keyexpr:", result.keyexpr().toString());
        assertEquals(result.kind(), SampleKind.DELETE, "Should be DELETE sample");
      }
    }

    await queryable.undeclare();
  } finally {
    if (session1) await session1.close();
    if (session2) await session2.close();
  }
});
