namespace Voticus.Api.Options;

public class StorageOptions
{
    public const string Section = "Storage";

    // Relative paths resolve against the content root.
    public string LocalPath { get; set; } = "App_Data/images";
}
