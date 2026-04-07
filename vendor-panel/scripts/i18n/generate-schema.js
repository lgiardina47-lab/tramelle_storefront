const fs = require("fs/promises")
const path = require("path")
const prettier = require("prettier")

const translationsDir = path.join(__dirname, "../../src/i18n/translations")
const itPath = path.join(translationsDir, "it.json")
const schemaPath = path.join(translationsDir, "$schema.json")

function generateSchemaFromObject(obj) {
  if (typeof obj !== "object" || obj === null) {
    return { type: typeof obj }
  }

  if (Array.isArray(obj)) {
    return {
      type: "array",
      items: generateSchemaFromObject(obj[0] || "string"),
    }
  }

  const properties = {}
  const required = []

  Object.entries(obj).forEach(([key, value]) => {
    properties[key] = generateSchemaFromObject(value)
    required.push(key)
  })

  return {
    type: "object",
    properties,
    required,
    additionalProperties: false,
  }
}

async function outputSchema() {
  const itContent = await fs.readFile(itPath, "utf-8")
  const itJson = JSON.parse(itContent)

  const schema = {
    $schema: "http://json-schema.org/draft-07/schema#",
    ...generateSchemaFromObject(itJson),
  }

  const formattedSchema = await prettier.format(
    JSON.stringify(schema, null, 2),
    {
      parser: "json",
    }
  )

  await fs
    .writeFile(schemaPath, formattedSchema)
    .then(() => {
      console.log("Schema generated successfully at:", schemaPath)
    })
    .catch((error) => {
      console.error("Error generating schema:", error.message)
      process.exit(1)
    })
}

outputSchema()
