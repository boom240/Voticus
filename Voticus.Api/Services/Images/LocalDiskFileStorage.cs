using Microsoft.Extensions.Options;
using Voticus.Api.Options;

namespace Voticus.Api.Services.Images;

public class LocalDiskFileStorage : IFileStorage
{
    private readonly string _root;

    public LocalDiskFileStorage(IOptions<StorageOptions> options, IHostEnvironment environment)
    {
        var path = options.Value.LocalPath;
        _root = Path.IsPathRooted(path) ? path : Path.Combine(environment.ContentRootPath, path);
        Directory.CreateDirectory(_root);
    }

    public async Task SaveAsync(string key, byte[] content, CancellationToken cancellationToken = default)
    {
        await File.WriteAllBytesAsync(PathFor(key), content, cancellationToken);
    }

    public Task<Stream?> OpenReadAsync(string key, CancellationToken cancellationToken = default)
    {
        var path = PathFor(key);
        if (!File.Exists(path))
        {
            return Task.FromResult<Stream?>(null);
        }
        return Task.FromResult<Stream?>(new FileStream(path, FileMode.Open, FileAccess.Read, FileShare.Read, 4096, useAsync: true));
    }

    public Task DeleteAsync(string key, CancellationToken cancellationToken = default)
    {
        var path = PathFor(key);
        if (File.Exists(path))
        {
            File.Delete(path);
        }
        return Task.CompletedTask;
    }

    private string PathFor(string key)
    {
        if (!StorageKeys.IsValid(key))
        {
            throw new ArgumentException("Invalid storage key.", nameof(key));
        }
        return Path.Combine(_root, key);
    }
}
