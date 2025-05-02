import { APIGatewayProxyHandlerV2 } from "aws-lambda";

import { DynamoDBClient } from "@aws-sdk/client-dynamodb";
import { DynamoDBDocumentClient, DeleteCommand, GetCommand, QueryCommand } from "@aws-sdk/lib-dynamodb";
import { Role } from "aws-cdk-lib/aws-iam";

const client = createDDbDocClient();



export const handler: APIGatewayProxyHandlerV2 = async (event, context) => {
  try {
    console.log("Event: ", JSON.stringify(event));
    const pathParameters  = event?.pathParameters;
    const queryParams  = event?.queryStringParameters; 
    const movieId = pathParameters?.movieId ? parseInt(pathParameters.movieId) : undefined;
    const includeRole = queryParams?.role === "true"; // Check to see if 'true' is there

    if (!movieId) {
      return {
        statusCode: 404,
        headers: {
          "content-type": "application/json",
        },
        body: JSON.stringify({ Message: "Missing movie Id" }),
      };
    }

    const commandOutput = await client.send(
      new GetCommand({
        TableName: process.env.TABLE_NAME,
        Key: { id: movieId },
      })
    );
    console.log("GetCommand response: ", commandOutput);
    if (!commandOutput.Item) {
      return {
        statusCode: 404,
        headers: {
          "content-type": "application/json",
        },
        body: JSON.stringify({ Message: "Invalid movie Id" }),
      };
    }

    const body: { data: Record<string, any>; role?: any []} ={
      data: commandOutput.Item,
    };

    if (includeRole){
      const roleResponse = await client.send(
        new QueryCommand({
          TableName: process.env.TABLE_NAME,
          KeyConditionExpression: "movieId = :g",
          ExpressionAttributeValues:{
            ":g": movieId,
          },
        })
      );
      body.role = roleResponse.Items || [];
    }


    return {
      statusCode: 200,
      headers: {
        "content-type": "application/json",
      },
      body: JSON.stringify({}),
    };
  } catch (error: any) {
    console.log(JSON.stringify(error));
    return {
      statusCode: 500,
      headers: {
        "content-type": "application/json",
      },
      body: JSON.stringify({ error }),
    };
  }
};

function createDDbDocClient() {
  const ddbClient = new DynamoDBClient({ region: process.env.REGION });
  const marshallOptions = {
    convertEmptyValues: true,
    removeUndefinedValues: true,
    convertClassInstanceToMap: true,
  };
  const unmarshallOptions = {
    wrapNumbers: false,
  };
  const translateConfig = { marshallOptions, unmarshallOptions };
  return DynamoDBDocumentClient.from(ddbClient, translateConfig);
}
